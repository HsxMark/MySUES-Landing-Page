from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/sanxuanyi"

    # Auth
    admin_username: str = "admin"
    admin_password: str = "change-this-password"
    jwt_secret: str = "change-this-secret-key"
    jwt_expire_hours: int = 24

    # App file cache (used by /api/apps/*/download)
    app_file_cache_dir: str = "/tmp/sanxuanyi-app-cache"
    app_file_cache_max_size_mb: int = 1024

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()
