import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base
import enum

class User(Base):
    __tablename__ = "users"

    id               : Mapped[str]      = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email            : Mapped[str]      = mapped_column(String, unique=True, nullable=False, index=True)
    password_hash  : Mapped[str]      = mapped_column(String, nullable=False)
    username        : Mapped[str]      = mapped_column(String, nullable=True)
    avatar_url        : Mapped[str]      = mapped_column(String, nullable=True)
    is_active        : Mapped[bool]     = mapped_column(Boolean, default=True)
    created_at       : Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at       : Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # relationship — one user has many documents
    documents: Mapped[list["Document"]] = relationship("Document", back_populates="owner", cascade="all, delete-orphan")