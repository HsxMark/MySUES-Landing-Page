from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class AppCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., min_length=1, max_length=100, pattern=r"^[a-z0-9-]+$")
    description: str | None = None
    platform: str | None = Field(None, max_length=50)
    icon_image_id: str | None = None


class AppUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    slug: str | None = Field(None, min_length=1, max_length=100, pattern=r"^[a-z0-9-]+$")
    description: str | None = None
    platform: str | None = Field(None, max_length=50)
    icon_image_id: str | None = None


class AppVersionResponse(BaseModel):
    id: UUID
    app_id: UUID
    platform: str
    version: str
    build_number: int
    min_supported_build_number: int | None
    changelog: str | None
    file_url: str | None
    external_url: str | None
    filename: str
    file_size: int
    content_type: str
    download_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class AppResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None
    platform: str | None
    icon_image_id: str | None
    created_at: datetime
    updated_at: datetime
    latest_version: AppVersionResponse | None = None

    model_config = {"from_attributes": True}


class AppDetailResponse(AppResponse):
    versions: list[AppVersionResponse] = []


class AppReleaseResponse(BaseModel):
    app_id: UUID
    slug: str
    name: str
    platform: str
    current_version: str | None = None
    current_build_number: int | None = None
    latest_version: AppVersionResponse | None = None
    update_available: bool
    update_required: bool
    update_url: str | None = None


class AppStartupRequest(BaseModel):
    platform: str = Field(..., min_length=1, max_length=20)
    installation_id: str = Field(..., min_length=8, max_length=255)
    app_version: str | None = Field(None, max_length=50)
    build_number: int | None = Field(None, ge=0)


class AppMetricsPlatformSummary(BaseModel):
    platform: str
    installations: int
    opens: int
    active_7d: int
    active_30d: int


class AppMetricsResponse(BaseModel):
    app_id: UUID
    slug: str
    total_installations: int
    total_opens: int
    active_7d: int
    active_30d: int
    platforms: list[AppMetricsPlatformSummary]
    versions: list[AppVersionResponse]
