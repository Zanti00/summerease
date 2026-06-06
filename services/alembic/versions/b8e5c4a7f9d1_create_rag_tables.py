"""create rag tables

Revision ID: b8e5c4a7f9d1
Revises: a3f9e9a4d2e7
Create Date: 2026-06-06 08:36:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b8e5c4a7f9d1'
down_revision: Union[str, Sequence[str], None] = 'a3f9e9a4d2e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # 2. Create document_chunks table
    op.create_table(
        'document_chunks',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('chunk_content', sa.Text(), nullable=False),
        sa.Column('chunk_hash', sa.String(length=64), nullable=False),
        sa.Column('token_count', sa.Integer(), nullable=False),
        sa.Column('char_count', sa.Integer(), nullable=False),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('document_id', 'chunk_index', name='uq_document_chunk_index')
    )

    # Indexes on document_chunks
    op.create_index('idx_chunks_document_id', 'document_chunks', ['document_id'])
    op.create_index('idx_chunks_hash', 'document_chunks', ['chunk_hash'])
    # GIN index on metadata JSONB
    op.create_index(
        'idx_chunks_metadata',
        'document_chunks',
        ['metadata'],
        postgresql_using='gin'
    )

    # 3. Create embeddings table
    op.create_table(
        'embeddings',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('chunk_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('document_chunks.id', ondelete='CASCADE'), nullable=False),
        # VECTOR type with 768 dimensions for text-embedding-004
        sa.Column('embedding_vector', postgresql.ARRAY(sa.Float()), nullable=False), # Placeholder for sqlalchemy, vector type will be handled via raw SQL
        sa.Column('embedding_model', sa.String(length=50), nullable=False, server_default='text-embedding-004'),
        sa.Column('model_version', sa.String(length=20), nullable=False, server_default='v1'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('chunk_id', 'embedding_model', 'model_version', name='uq_chunk_model_version')
    )

    # Modify the column type to pgvector's vector type in postgres
    op.execute("ALTER TABLE embeddings ALTER COLUMN embedding_vector TYPE vector(768);")

    # Indexes on embeddings
    op.create_index('idx_embeddings_chunk_id', 'embeddings', ['chunk_id'])
    op.create_index('idx_embeddings_model', 'embeddings', ['embedding_model', 'model_version'])

    # HNSW index for cosine similarity search
    op.execute(
        "CREATE INDEX idx_embeddings_hnsw ON embeddings "
        "USING hnsw (embedding_vector vector_cosine_ops) "
        "WITH (m = 16, ef_construction = 200);"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('embeddings')
    op.drop_table('document_chunks')
