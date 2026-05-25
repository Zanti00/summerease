"""create documents tables

Revision ID: 7dd9cd78baac
Revises: 
Create Date: 2026-05-25 16:04:43.227566

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7dd9cd78baac'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    from sqlalchemy.dialects import postgresql
    
    op.create_table(
        'documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('original_file_url', sa.Text(), nullable=True),
        sa.Column('content', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('content_html', sa.Text(), nullable=True),
        sa.Column('file_type', sa.String(length=50), nullable=True),
        sa.Column('file_size', sa.BigInteger(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True)
    )

    op.create_table(
        'document_versions',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('content', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], )
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('document_versions')
    op.drop_table('documents')
