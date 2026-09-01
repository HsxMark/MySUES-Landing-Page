from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.database_url, echo=False, pool_pre_ping=True)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def _upgrade_postgres_schema():
    statements = [
        "ALTER TABLE app_versions ADD COLUMN IF NOT EXISTS platform VARCHAR(20)",
        "ALTER TABLE app_versions ALTER COLUMN platform SET DEFAULT 'android'",
        "UPDATE app_versions SET platform = 'android' WHERE platform IS NULL",
        "ALTER TABLE app_versions ALTER COLUMN platform SET NOT NULL",
        "ALTER TABLE app_versions ADD COLUMN IF NOT EXISTS build_number INTEGER",
        "ALTER TABLE app_versions ALTER COLUMN build_number SET DEFAULT 1",
        "UPDATE app_versions SET build_number = 1 WHERE build_number IS NULL",
        "ALTER TABLE app_versions ALTER COLUMN build_number SET NOT NULL",
        "ALTER TABLE app_versions ADD COLUMN IF NOT EXISTS min_supported_build_number INTEGER",
        "ALTER TABLE app_versions ADD COLUMN IF NOT EXISTS external_url VARCHAR(500)",
        "ALTER TABLE app_versions ALTER COLUMN s3_key DROP NOT NULL",
        # images feature removed: drop FK that pointed at the deleted images table
        "ALTER TABLE apps DROP CONSTRAINT IF EXISTS apps_icon_image_id_fkey",
    ]

    async with engine.begin() as conn:
        for statement in statements:
            await conn.execute(text(statement))


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    if engine.dialect.name == "postgresql":
        await _upgrade_postgres_schema()
