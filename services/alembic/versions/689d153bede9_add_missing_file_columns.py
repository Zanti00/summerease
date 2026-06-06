"""add_missing_file_columns

Revision ID: 689d153bede9
Revises: b8e5c4a7f9d1
Create Date: 2026-06-06 08:54:05.253221

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '689d153bede9'
down_revision: Union[str, Sequence[str], None] = 'b8e5c4a7f9d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('documents', sa.Column('file_name', sa.String(length=255), nullable=True))
    op.add_column('documents', sa.Column('file_hash', sa.String(length=64), nullable=True))
    op.add_column('documents', sa.Column('storage_path', sa.Text(), nullable=True))
    op.alter_column('documents', 'upload_status',
               existing_type=sa.VARCHAR(length=20),
               nullable=True,
               existing_server_default=sa.text("'pending'::character varying"))
    op.alter_column('documents', 'processing_status',
               existing_type=sa.VARCHAR(length=20),
               nullable=True,
               existing_server_default=sa.text("'pending'::character varying"))


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('documents', 'processing_status',
               existing_type=sa.VARCHAR(length=20),
               nullable=False,
               existing_server_default=sa.text("'pending'::character varying"))
    op.alter_column('documents', 'upload_status',
               existing_type=sa.VARCHAR(length=20),
               nullable=False,
               existing_server_default=sa.text("'pending'::character varying"))
    op.drop_column('documents', 'storage_path')
    op.drop_column('documents', 'file_hash')
    op.drop_column('documents', 'file_name')
