from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    DateTime,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class App(Base):
    __tablename__ = "apps"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    platform: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # Icon reference is a plain string now; the images feature was removed.
    icon_image_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    versions: Mapped[list["AppVersion"]] = relationship(
        "AppVersion",
        back_populates="app",
        cascade="all, delete-orphan",
        order_by=lambda: [AppVersion.build_number.desc(), AppVersion.created_at.desc()],
    )
    installations: Mapped[list["AppInstallation"]] = relationship(
        "AppInstallation",
        back_populates="app",
        cascade="all, delete-orphan",
    )


class AppVersion(Base):
    __tablename__ = "app_versions"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    app_id: Mapped[UUID] = mapped_column(
        ForeignKey("apps.id", ondelete="CASCADE"), nullable=False
    )
    platform: Mapped[str] = mapped_column(
        String(20), nullable=False, default="android", server_default="android"
    )
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    build_number: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default="1"
    )
    min_supported_build_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    changelog: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Backwards-compatible: the DB column is still named "s3_key".
    file_url: Mapped[str | None] = mapped_column("s3_key", String(500), nullable=True)
    external_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0, server_default="0")
    content_type: Mapped[str] = mapped_column(
        String(100), nullable=False, default="application/octet-stream", server_default="application/octet-stream"
    )
    download_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    app: Mapped["App"] = relationship("App", back_populates="versions")


class AppInstallation(Base):
    __tablename__ = "app_installations"
    __table_args__ = (
        UniqueConstraint(
            "app_id",
            "platform",
            "installation_id",
            name="uq_app_installations_identity",
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    app_id: Mapped[UUID] = mapped_column(
        ForeignKey("apps.id", ondelete="CASCADE"), nullable=False
    )
    platform: Mapped[str] = mapped_column(String(20), nullable=False)
    installation_id: Mapped[str] = mapped_column(String(255), nullable=False)
    last_app_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    last_build_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    open_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    first_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    app: Mapped["App"] = relationship("App", back_populates="installations")
