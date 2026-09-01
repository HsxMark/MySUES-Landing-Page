import os
import re
import shutil
from pathlib import Path
from uuid import UUID, uuid4
from urllib.parse import unquote, urlparse

from app.config import get_settings


_FILENAME_SAFE_RE = re.compile(r"[^A-Za-z0-9._-]+")


def _safe_basename(name: str) -> str:
    # Drop any path segments the client might send.
    name = os.path.basename(name or "")
    name = name.strip().strip(".")
    if not name:
        return "download.bin"
    name = _FILENAME_SAFE_RE.sub("_", name)
    # Avoid absurdly long filenames (DB limit is 255 anyway).
    return name[:200] or "download.bin"


class AppFileCache:
    def __init__(self, cache_dir: str, max_size_mb: int):
        self._cache_dir = Path(cache_dir)
        self._max_size_bytes = max(0, int(max_size_mb)) * 1024 * 1024

    def safe_filename(self, filename: str) -> str:
        return _safe_basename(filename)

    def guess_filename_from_url(self, url: str) -> str:
        try:
            parsed = urlparse(url)
        except Exception:
            return "download.bin"
        name = os.path.basename(parsed.path or "")
        name = unquote(name)
        return self.safe_filename(name) if name else "download.bin"

    def get_version_dir(self, app_id: UUID, version_id: UUID) -> Path:
        return self._cache_dir / str(app_id) / str(version_id)

    def get_version_file_path(self, app_id: UUID, version_id: UUID, filename: str) -> Path:
        return self.get_version_dir(app_id, version_id) / self.safe_filename(filename)

    def get_temp_path(self, final_path: Path) -> Path:
        # Unique tmp name so concurrent downloads don't trample each other.
        return final_path.with_name(f"{final_path.name}.{uuid4().hex}.part")

    def mark_used(self, path: Path) -> None:
        # Touch mtime so cleanup can work like a simple LRU.
        os.utime(path, None)

    def delete_version(self, app_id: UUID, version_id: UUID) -> None:
        shutil.rmtree(self.get_version_dir(app_id, version_id), ignore_errors=True)

    def delete_app(self, app_id: UUID) -> None:
        shutil.rmtree(self._cache_dir / str(app_id), ignore_errors=True)

    def cleanup(self) -> None:
        """
        Best-effort size cap: if cache exceeds max_size, delete oldest files first (by mtime).
        """
        if self._max_size_bytes <= 0:
            return
        if not self._cache_dir.exists():
            return

        files: list[tuple[float, int, Path]] = []
        total = 0
        for p in self._cache_dir.rglob("*"):
            try:
                if not p.is_file():
                    continue
                st = p.stat()
            except OSError:
                continue
            total += st.st_size
            files.append((st.st_mtime, st.st_size, p))

        if total <= self._max_size_bytes:
            return

        files.sort(key=lambda x: x[0])  # oldest first
        for _, size, p in files:
            try:
                p.unlink(missing_ok=True)
            except OSError:
                continue
            total -= size
            if total <= self._max_size_bytes:
                break

        # Try to remove empty folders (best effort).
        for p in sorted(self._cache_dir.rglob("*"), reverse=True):
            try:
                if p.is_dir():
                    p.rmdir()
            except OSError:
                pass


settings = get_settings()
app_file_cache = AppFileCache(
    cache_dir=settings.app_file_cache_dir,
    max_size_mb=settings.app_file_cache_max_size_mb,
)
