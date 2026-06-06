"""add rag columns to documents

Revision ID: a3f9e9a4d2e7
Revises: 7dd9cd78baac
Create Date: 2026-06-06 08:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a3f9e9a4d2e7'
down_revision: Union[str, Sequence[str], None] = '7dd9cd78baac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('documents', sa.Column('upload_status', sa.String(length=20), nullable=False, server_default='pending'))
    op.add_column('documents', sa.Column('processing_status', sa.String(length=20), nullable=False, server_default='pending'))
    op.add_column('documents', sa.Column('total_chunks', sa.Integer(), nullable=True, server_default='0'))
    op.add_column('documents', sa.Column('total_tokens', sa.Integer(), nullable=True, server_default='0'))
    op.add_column('documents', sa.Column('processing_error', sa.Text(), nullable=True))
    op.add_column('documents', sa.Column('processing_started_at', sa.DateTime(), nullable=True))
    op.add_column('documents', sa.Column('processing_completed_at', sa.DateTime(), nullable=True))

    # Add partial index for multi-tenant querying
    op.create_index(
        'idx_documents_owner_processing',
        'documents',
        ['owner_id', 'processing_status'],
        postgresql_where=sa.text('deleted_at IS NULL')
    )
    # Add partial index for active jobs
    op.create_index(
        'idx_documents_processing_status',
        'documents',
        ['processing_status'],
        postgresql_where=sa.text("processing_status NOT IN ('completed', 'failed')")
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_documents_processing_status', table_name='documents')
    op.drop_index('idx_documents_owner_processing', table_name='documents')
    op.drop_column('documents', 'processing_completed_at')
    op.drop_column('documents', 'processing_started_at')
    op.drop_column('documents', 'processing_error')
    op.drop_column('documents', 'total_tokens')
    op.drop_column('documents', 'total_chunks')
    op.drop_column('documents', 'processing_status')
    op.drop_column('documents', 'upload_status')
