import asyncio
import logging
import os
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote, unquote, urlparse
from urllib.request import Request, urlopen
from uuid import UUID

from fastapi import APIRouter, Depends, Form, HTTPException, Query, status
from fastapi.responses import RedirectResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.app import App, AppInstallation, AppVersion
from app.schemas.app import (
    AppCreate,
    AppDetailResponse,
    AppMetricsPlatformSummary,
    AppMetricsResponse,
    AppReleaseResponse,
    AppResponse,
    AppStartupRequest,
    AppUpdate,
    AppVersionResponse,
)
from app.services.app_file_cache import app_file_cache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/apps", tags=["apps"])

_DOWNLOAD_CHUNK_SIZE = 64 * 1024
_URL_TIMEOUT_SECONDS = 30
_USER_AGENT = "SanxuanyiBackend/1.0"
_DOWNLOAD_CACHE_CONTROL = "public, max-age=31536000, immutable"
_ALLOWED_PLATFORMS = {"android", "ios"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def _get_app_or_404(db: AsyncSession, app_id: UUID) -> App:
    result = await db.execute(select(App).where(App.id == app_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")
    return app


async def _get_app_by_slug_or_404(
    db: AsyncSession,
    slug: str,
    *,
    include_versions: bool = False,
    include_installations: bool = False,
) -> App:
    options = []
    if include_versions:
        options.append(selectinload(App.versions))
    if include_installations:
        options.append(selectinload(App.installations))

    stmt = select(App).where(App.slug == slug)
    if options:
        stmt = stmt.options(*options)

    result = await db.execute(stmt)
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")
    return app


async def _get_version_or_404(db: AsyncSession, app_id: UUID, version_id: UUID) -> AppVersion:
    result = await db.execute(
        select(AppVersion).where(AppVersion.id == version_id, AppVersion.app_id == app_id)
    )
    version = result.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")
    return version


async def _get_installation(
    db: AsyncSession,
    app_id: UUID,
    platform: str,
    installation_id: str,
) -> AppInstallation | None:
    result = await db.execute(
        select(AppInstallation).where(
            AppInstallation.app_id == app_id,
            AppInstallation.platform == platform,
            AppInstallation.installation_id == installation_id,
        )
    )
    return result.scalar_one_or_none()


def _normalize_platform(value: str) -> str:
    platform = value.strip().lower()
    if platform not in _ALLOWED_PLATFORMS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported platform '{value}'",
        )
    return platform


def _normalize_optional_url(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _normalize_seen_at(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _latest_version_for_platform(app: App, platform: str) -> AppVersion | None:
    versions = [v for v in app.versions if v.platform == platform]
    if not versions:
        return None
    return max(versions, key=lambda v: (v.build_number, v.created_at))


def _build_app_response(app: App) -> dict:
    latest = app.versions[0] if app.versions else None
    return {
        "id": app.id,
        "name": app.name,
        "slug": app.slug,
        "description": app.description,
        "platform": app.platform,
        "icon_image_id": app.icon_image_id,
        "created_at": app.created_at,
        "updated_at": app.updated_at,
        "latest_version": latest,
    }


def _is_http_url(url: str | None) -> bool:
    if not url:
        return False
    try:
        parsed = urlparse(url)
    except Exception:
        return False
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def _filename_from_content_disposition(value: str | None) -> str | None:
    if not value:
        return None

    parts = [p.strip() for p in value.split(";")]
    for part in parts[1:]:
        if part.lower().startswith("filename*="):
            _, v = part.split("=", 1)
            v = v.strip().strip('"')
            if "''" in v:
                _, enc_value = v.split("''", 1)
                return unquote(enc_value)
            return unquote(v)

    for part in parts[1:]:
        if part.lower().startswith("filename="):
            _, v = part.split("=", 1)
            v = v.strip()
            if v.startswith('"') and v.endswith('"'):
                v = v[1:-1]
            return v

    return None


def _normalize_content_type(value: str | None) -> str | None:
    if not value:
        return None
    base = value.split(";", 1)[0].strip()
    return base or None


def _probe_url_metadata(url: str, strict: bool = False) -> tuple[str | None, int | None, str | None]:
    headers = {"User-Agent": _USER_AGENT}

    try:
        req = Request(url, method="HEAD", headers=headers)
        with urlopen(req, timeout=_URL_TIMEOUT_SECONDS) as resp:
            content_type = _normalize_content_type(resp.headers.get("Content-Type"))
            content_length = resp.headers.get("Content-Length")
            cd = resp.headers.get("Content-Disposition")
            filename = _filename_from_content_disposition(cd)
            length = int(content_length) if content_length and content_length.isdigit() else None
            return content_type, length, filename
    except Exception:
        pass

    try:
        range_headers = {**headers, "Range": "bytes=0-0"}
        req = Request(url, headers=range_headers)
        with urlopen(req, timeout=_URL_TIMEOUT_SECONDS) as resp:
            content_type = _normalize_content_type(resp.headers.get("Content-Type"))
            cd = resp.headers.get("Content-Disposition")
            filename = _filename_from_content_disposition(cd)

            total = None
            content_range = resp.headers.get("Content-Range")
            if content_range and "/" in content_range:
                tail = content_range.split("/", 1)[1].strip()
                if tail.isdigit():
                    total = int(tail)

            if total is None:
                content_length = resp.headers.get("Content-Length")
                if content_length and content_length.isdigit():
                    total = int(content_length)

            return content_type, total, filename
    except Exception:
        pass

    try:
        req = Request(url, headers=headers)
        with urlopen(req, timeout=_URL_TIMEOUT_SECONDS) as resp:
            content_type = _normalize_content_type(resp.headers.get("Content-Type"))
            content_length = resp.headers.get("Content-Length")
            cd = resp.headers.get("Content-Disposition")
            filename = _filename_from_content_disposition(cd)
            length = int(content_length) if content_length and content_length.isdigit() else None
            return content_type, length, filename
    except Exception as e:
        if strict:
            raise e
        return None, None, None


def _iter_file(path: Path):
    with path.open("rb") as f:
        while True:
            chunk = f.read(_DOWNLOAD_CHUNK_SIZE)
            if not chunk:
                break
            yield chunk


def _iter_url_and_cache(url: str, tmp_path: Path, final_path: Path):
    req = Request(url, headers={"User-Agent": _USER_AGENT})
    out = None

    try:
        with urlopen(req, timeout=_URL_TIMEOUT_SECONDS) as resp:
            try:
                tmp_path.parent.mkdir(parents=True, exist_ok=True)
                out = tmp_path.open("wb")
            except OSError:
                out = None

            try:
                while True:
                    chunk = resp.read(_DOWNLOAD_CHUNK_SIZE)
                    if not chunk:
                        break
                    if out is not None:
                        out.write(chunk)
                    yield chunk
            finally:
                if out is not None:
                    out.flush()
                    out.close()

        if out is not None:
            try:
                if final_path.exists():
                    tmp_path.unlink(missing_ok=True)
                else:
                    os.replace(tmp_path, final_path)
            finally:
                app_file_cache.cleanup()
    except Exception:
        try:
            tmp_path.unlink(missing_ok=True)
        except Exception:
            pass
        raise


def _build_download_url(app_id: UUID, version_id: UUID, filename: str) -> str:
    safe_filename = app_file_cache.safe_filename(filename)
    encoded_filename = quote(safe_filename, safe="._-")
    return f"/api/apps/{app_id}/versions/{version_id}/download/{encoded_filename}"


def _build_download_headers(filename: str, content_length: int | None = None) -> dict[str, str]:
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Cache-Control": _DOWNLOAD_CACHE_CONTROL,
        "CDN-Cache-Control": _DOWNLOAD_CACHE_CONTROL,
    }
    if content_length is not None:
        headers["Content-Length"] = str(content_length)
    return headers


def _resolve_update_url(app: App, version: AppVersion | None) -> str | None:
    if version is None:
        return None
    if version.platform == "android" and version.file_url:
        return _build_download_url(app.id, version.id, version.filename)
    return version.external_url or version.file_url


def _build_release_response(
    app: App,
    platform: str,
    *,
    current_version: str | None = None,
    current_build_number: int | None = None,
) -> AppReleaseResponse:
    latest_version = _latest_version_for_platform(app, platform)
    update_available = False
    update_required = False

    if latest_version is not None and current_build_number is not None:
        update_available = latest_version.build_number > current_build_number
        update_required = (
            latest_version.min_supported_build_number is not None
            and current_build_number < latest_version.min_supported_build_number
        )

    return AppReleaseResponse(
        app_id=app.id,
        slug=app.slug,
        name=app.name,
        platform=platform,
        current_version=current_version,
        current_build_number=current_build_number,
        latest_version=latest_version,
        update_available=update_available,
        update_required=update_required,
        update_url=_resolve_update_url(app, latest_version),
    )


def _build_metrics_response(app: App) -> AppMetricsResponse:
    now = _utcnow()
    cutoff_7d = now - timedelta(days=7)
    cutoff_30d = now - timedelta(days=30)

    total_opens = 0
    active_7d = 0
    active_30d = 0
    platform_buckets: dict[str, dict[str, int]] = defaultdict(
        lambda: {"installations": 0, "opens": 0, "active_7d": 0, "active_30d": 0}
    )

    for installation in app.installations:
        last_seen_at = _normalize_seen_at(installation.last_seen_at)
        total_opens += installation.open_count
        if last_seen_at >= cutoff_7d:
            active_7d += 1
        if last_seen_at >= cutoff_30d:
            active_30d += 1

        bucket = platform_buckets[installation.platform]
        bucket["installations"] += 1
        bucket["opens"] += installation.open_count
        if last_seen_at >= cutoff_7d:
            bucket["active_7d"] += 1
        if last_seen_at >= cutoff_30d:
            bucket["active_30d"] += 1

    platforms = [
        AppMetricsPlatformSummary(platform=platform, **bucket)
        for platform, bucket in sorted(platform_buckets.items())
    ]

    return AppMetricsResponse(
        app_id=app.id,
        slug=app.slug,
        total_installations=len(app.installations),
        total_opens=total_opens,
        active_7d=active_7d,
        active_30d=active_30d,
        platforms=platforms,
        versions=list(app.versions),
    )


async def _stream_version_download(
    app_id: UUID,
    version_id: UUID,
    version: AppVersion,
    db: AsyncSession,
):
    download_filename = app_file_cache.safe_filename(version.filename)

    if not _is_http_url(version.file_url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file URL for this version",
        )

    cached_path = app_file_cache.get_version_file_path(app_id, version_id, download_filename)
    if cached_path.exists():
        try:
            app_file_cache.mark_used(cached_path)
        except Exception:
            pass

        file_size = cached_path.stat().st_size

        if version.file_size != file_size:
            version.file_size = file_size

        version.download_count += 1
        await db.commit()

        return StreamingResponse(
            _iter_file(cached_path),
            media_type=version.content_type,
            headers=_build_download_headers(download_filename, file_size),
        )

    try:
        probed_content_type, probed_length, _ = await asyncio.to_thread(
            _probe_url_metadata, version.file_url, True
        )
    except Exception as e:
        logger.error("App file upstream probe failed for %s/%s: %s", app_id, version_id, e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to retrieve file from upstream",
        )

    if version.file_size == 0 and probed_length:
        version.file_size = probed_length
    if version.content_type == "application/octet-stream" and probed_content_type:
        version.content_type = probed_content_type[:100]
    content_type = version.content_type or probed_content_type or "application/octet-stream"
    content_length = version.file_size or probed_length

    version.download_count += 1
    await db.commit()

    final_path = cached_path
    tmp_path = app_file_cache.get_temp_path(final_path)

    return StreamingResponse(
        _iter_url_and_cache(version.file_url, tmp_path, final_path),
        media_type=content_type,
        headers=_build_download_headers(download_filename, content_length),
    )


# ---------------------------------------------------------------------------
# Public endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=list[AppResponse])
async def list_apps(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(App).options(selectinload(App.versions)).order_by(App.created_at.desc())
    )
    apps = result.scalars().unique().all()
    return [_build_app_response(a) for a in apps]


@router.get("/by-slug/{slug}", response_model=AppDetailResponse)
async def get_app_by_slug(slug: str, db: AsyncSession = Depends(get_db)):
    app = await _get_app_by_slug_or_404(db, slug, include_versions=True)
    data = _build_app_response(app)
    data["versions"] = list(app.versions)
    return data


@router.get("/by-slug/{slug}/release", response_model=AppReleaseResponse)
async def get_release_by_slug(
    slug: str,
    platform: str = Query(...),
    current_version: str | None = Query(None),
    current_build_number: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    normalized_platform = _normalize_platform(platform)
    app = await _get_app_by_slug_or_404(db, slug, include_versions=True)
    return _build_release_response(
        app,
        normalized_platform,
        current_version=current_version,
        current_build_number=current_build_number,
    )


@router.post("/by-slug/{slug}/startup", response_model=AppReleaseResponse)
async def startup_by_slug(
    slug: str,
    data: AppStartupRequest,
    db: AsyncSession = Depends(get_db),
):
    normalized_platform = _normalize_platform(data.platform)
    app = await _get_app_by_slug_or_404(db, slug, include_versions=True)
    installation = await _get_installation(db, app.id, normalized_platform, data.installation_id)

    if installation is None:
        installation = AppInstallation(
            app_id=app.id,
            platform=normalized_platform,
            installation_id=data.installation_id,
            open_count=0,
            first_seen_at=_utcnow(),
            last_seen_at=_utcnow(),
        )
        db.add(installation)

    installation.last_app_version = data.app_version
    installation.last_build_number = data.build_number
    installation.open_count += 1
    installation.last_seen_at = _utcnow()

    await db.commit()

    return _build_release_response(
        app,
        normalized_platform,
        current_version=data.app_version,
        current_build_number=data.build_number,
    )


@router.get("/{app_id}", response_model=AppDetailResponse)
async def get_app(app_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(App).options(selectinload(App.versions)).where(App.id == app_id)
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")
    data = _build_app_response(app)
    data["versions"] = list(app.versions)
    return data


@router.get("/{app_id}/versions", response_model=list[AppVersionResponse])
async def list_versions(app_id: UUID, db: AsyncSession = Depends(get_db)):
    await _get_app_or_404(db, app_id)
    result = await db.execute(
        select(AppVersion)
        .where(AppVersion.app_id == app_id)
        .order_by(AppVersion.build_number.desc(), AppVersion.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{app_id}/versions/{version_id}/download")
async def download_version_legacy(
    app_id: UUID,
    version_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    version = await _get_version_or_404(db, app_id, version_id)
    if version.platform != "android":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only Android versions support proxied download",
        )
    return RedirectResponse(
        url=_build_download_url(app_id, version_id, version.filename),
        status_code=status.HTTP_307_TEMPORARY_REDIRECT,
    )


@router.get("/{app_id}/versions/{version_id}/download/{filename}")
async def download_version(
    app_id: UUID,
    version_id: UUID,
    filename: str,
    db: AsyncSession = Depends(get_db),
):
    version = await _get_version_or_404(db, app_id, version_id)
    if version.platform != "android":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only Android versions support proxied download",
        )
    canonical_filename = app_file_cache.safe_filename(version.filename)
    requested_filename = app_file_cache.safe_filename(filename)

    if requested_filename != canonical_filename:
        return RedirectResponse(
            url=_build_download_url(app_id, version_id, canonical_filename),
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )

    return await _stream_version_download(app_id, version_id, version, db)


# ---------------------------------------------------------------------------
# Admin endpoints (require auth)
# ---------------------------------------------------------------------------

@router.get("/by-slug/{slug}/metrics", response_model=AppMetricsResponse)
async def get_app_metrics(
    slug: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    app = await _get_app_by_slug_or_404(
        db,
        slug,
        include_versions=True,
        include_installations=True,
    )
    return _build_metrics_response(app)


@router.post("", response_model=AppResponse, status_code=status.HTTP_201_CREATED)
async def create_app(
    data: AppCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    existing = await db.execute(select(App).where(App.slug == data.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"App with slug '{data.slug}' already exists",
        )

    app = App(**data.model_dump())
    db.add(app)
    await db.commit()
    await db.refresh(app, attribute_names=["versions"])
    return _build_app_response(app)


@router.put("/{app_id}", response_model=AppResponse)
async def update_app(
    app_id: UUID,
    data: AppUpdate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    result = await db.execute(
        select(App).options(selectinload(App.versions)).where(App.id == app_id)
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")

    update_data = data.model_dump(exclude_unset=True)
    if "slug" in update_data and update_data["slug"] != app.slug:
        conflict = await db.execute(select(App).where(App.slug == update_data["slug"]))
        if conflict.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"App with slug '{update_data['slug']}' already exists",
            )

    for key, value in update_data.items():
        setattr(app, key, value)

    await db.commit()
    await db.refresh(app, attribute_names=["versions"])
    return _build_app_response(app)


@router.delete("/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_app(
    app_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    app = await _get_app_or_404(db, app_id)

    await db.delete(app)
    await db.commit()

    try:
        await asyncio.to_thread(app_file_cache.delete_app, app_id)
    except Exception as e:
        logger.warning("Failed to clean app cache for %s: %s", app_id, e)


@router.post("/{app_id}/versions", response_model=AppVersionResponse, status_code=status.HTTP_201_CREATED)
async def create_version(
    app_id: UUID,
    platform: str = Form("android"),
    version: str = Form(...),
    build_number: int = Form(...),
    file_url: str | None = Form(None),
    external_url: str | None = Form(None),
    changelog: str | None = Form(None),
    filename: str | None = Form(None),
    min_supported_build_number: int | None = Form(None),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    app = await _get_app_or_404(db, app_id)
    normalized_platform = _normalize_platform(platform)
    normalized_file_url = _normalize_optional_url(file_url)
    normalized_external_url = _normalize_optional_url(external_url)

    if min_supported_build_number is not None and min_supported_build_number > build_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="min_supported_build_number cannot exceed build_number",
        )

    existing = await db.execute(
        select(AppVersion).where(
            AppVersion.app_id == app.id,
            AppVersion.platform == normalized_platform,
            AppVersion.build_number == build_number,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A version with this platform/build_number already exists",
        )

    if normalized_file_url and not _is_http_url(normalized_file_url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="file_url must be an http(s) URL",
        )
    if normalized_external_url and not _is_http_url(normalized_external_url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="external_url must be an http(s) URL",
        )
    if normalized_file_url and len(normalized_file_url) > 500:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="file_url is too long",
        )
    if normalized_external_url and len(normalized_external_url) > 500:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="external_url is too long",
        )

    if normalized_platform == "android" and not normalized_file_url and not normalized_external_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Android versions require file_url or external_url",
        )
    if normalized_platform == "ios" and not normalized_external_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="iOS versions require external_url",
        )

    probed_content_type = None
    probed_length = None
    probed_filename = None
    if normalized_file_url:
        probed_content_type, probed_length, probed_filename = await asyncio.to_thread(
            _probe_url_metadata, normalized_file_url
        )

    final_filename = filename or probed_filename
    if not final_filename and normalized_file_url:
        final_filename = app_file_cache.guess_filename_from_url(normalized_file_url)
    if not final_filename:
        final_filename = f"{app.slug}-{normalized_platform}-{version}"
    final_filename = app_file_cache.safe_filename(final_filename)
    final_filename = final_filename[:255] or "download.bin"

    content_type = (probed_content_type or "application/octet-stream")[:100]
    file_size = probed_length or 0

    app_version = AppVersion(
        app_id=app.id,
        platform=normalized_platform,
        version=version,
        build_number=build_number,
        min_supported_build_number=min_supported_build_number,
        changelog=changelog,
        file_url=normalized_file_url,
        external_url=normalized_external_url,
        filename=final_filename,
        file_size=file_size,
        content_type=content_type,
    )
    db.add(app_version)
    await db.commit()
    await db.refresh(app_version)
    return app_version


@router.delete("/{app_id}/versions/{version_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_version(
    app_id: UUID,
    version_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user),
):
    version = await _get_version_or_404(db, app_id, version_id)

    await db.delete(version)
    await db.commit()

    try:
        await asyncio.to_thread(app_file_cache.delete_version, app_id, version_id)
    except Exception as e:
        logger.warning("Failed to clean version cache for %s/%s: %s", app_id, version_id, e)
