import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, BigInteger, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from v1.app.core.database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), nullable=False)
    title = Column(String(255), nullable=False)
    original_file_url = Column(Text, nullable=True)
    content = Column(JSONB, nullable=True)
    content_html = Column(Text, nullable=True)
    file_type = Column(String(255), nullable=True)
    file_size = Column(BigInteger, nullable=True)
    file_name = Column(String(255), nullable=True)
    file_hash = Column(String(64), nullable=True)
    storage_path = Column(Text, nullable=True)
    is_autosave_enabled = Column(Boolean, default=False, nullable=False)
    
    # RAG Status Fields
    upload_status = Column(String(20), nullable=True, default='pending')
    processing_status = Column(String(20), nullable=True, default='pending')
    total_chunks = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    processing_error = Column(Text, nullable=True)
    processing_started_at = Column(DateTime, nullable=True)
    processing_completed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    versions = relationship("DocumentVersion", back_populates="document")

class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    content = Column(JSONB, nullable=True)
    created_by = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="versions")
