import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Enum, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base
import enum

class Document(Base):
    __tablename__ = "documents"

    id          : Mapped[str]            = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id     : Mapped[str]            = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    filename    : Mapped[str]            = mapped_column(String, nullable=False)
    original_name: Mapped[str]           = mapped_column(String, nullable=False)
    file_size   : Mapped[int]            = mapped_column(Integer, nullable=True)
    mime_type   : Mapped[str]            = mapped_column(String, nullable=True)   # application/pdf, etc.
    storage_url   : Mapped[str]            = mapped_column(String, nullable=True)
    is_favorite : Mapped[bool]           = mapped_column(Boolean, default=False)
    tags        : Mapped[str]            = mapped_column(String, nullable=True)   # comma-separated for now
    created_at  : Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at  : Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # relationship — back to owner
    owner: Mapped["User"] = relationship("User", back_populates="documents")