import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship, backref
from v1.app.core.database import Base

# Note: The vector type can be represented in SQLAlchemy using the pgvector library if installed,
# or as an Array of Float if we bind it customly. Since we're using pgvector, let's import the Vector
# type from pgvector.sqlalchemy if possible, or fall back to a custom TypeDecorator / ARRAY.
# To be robust and not fail if pgvector Python library is still installing, we can define a fallback or use pgvector.
try:
    from pgvector.sqlalchemy import Vector
except ImportError:
    # Fallback placeholder if not yet installed in IDE environment
    from sqlalchemy.types import UserDefinedType
    class Vector(UserDefinedType):
        def __init__(self, dim):
            self.dim = dim
        def get_col_spec(self, **kw):
            return f"vector({self.dim})"

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    chunk_content = Column(Text, nullable=False)
    chunk_hash = Column(String(64), nullable=False)
    token_count = Column(Integer, nullable=False)
    char_count = Column(Integer, nullable=False)
    chunk_metadata = Column("metadata", JSONB, nullable=False, default=dict, server_default='{}')
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint('document_id', 'chunk_index', name='uq_document_chunk_index'),
    )

    # Relationships
    document = relationship("Document", backref=backref("chunks", cascade="all, delete-orphan"))
    embeddings = relationship("Embedding", back_populates="chunk", cascade="all, delete-orphan")

class Embedding(Base):
    __tablename__ = "embeddings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chunk_id = Column(UUID(as_uuid=True), ForeignKey("document_chunks.id", ondelete="CASCADE"), nullable=False)
    # Using 768 dimensions for Google GenAI text-embedding-004
    embedding_vector = Column(Vector(768), nullable=False)
    embedding_model = Column(String(50), nullable=False, default="text-embedding-004", server_default="text-embedding-004")
    model_version = Column(String(20), nullable=False, default="v1", server_default="v1")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint('chunk_id', 'embedding_model', 'model_version', name='uq_chunk_model_version'),
    )

    # Relationships
    chunk = relationship("DocumentChunk", back_populates="embeddings")
