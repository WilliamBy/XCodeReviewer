"""Add design_doc_path column to projects

Revision ID: 010_add_design_doc_path_to_projects
Revises: 008_add_files_with_findings
Create Date: 2025-12-16

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '010_design_doc_path'
down_revision = '008_add_files_with_findings'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add design_doc_path column to projects table (idempotent)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('projects')]

    if 'design_doc_path' not in columns:
        op.add_column(
            'projects',
            sa.Column('design_doc_path', sa.String(500), nullable=True)
        )


def downgrade() -> None:
    op.drop_column('projects', 'design_doc_path')
