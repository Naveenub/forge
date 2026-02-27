"""Initial schema — complete Forge database

Revision ID: 001
Revises:
Create Date: 2025-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── users ──────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id",              postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email",           sa.String(255), unique=True, nullable=False),
        sa.Column("username",        sa.String(100), unique=True, nullable=False),
        sa.Column("name",            sa.String(255), nullable=False, server_default=""),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role",            sa.String(50),  nullable=False, server_default="contributor"),
        sa.Column("avatar",          sa.String(4),   nullable=True),
        sa.Column("is_active",       sa.Boolean,     nullable=False, server_default="true"),
        sa.Column("is_verified",     sa.Boolean,     nullable=False, server_default="false"),
        sa.Column("otp_secret",      sa.String(32),  nullable=True),
        sa.Column("otp_expires_at",  sa.DateTime,    nullable=True),
        sa.Column("last_login",      sa.DateTime,    nullable=True),
        sa.Column("created_at",      sa.DateTime,    nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at",      sa.DateTime,    nullable=True),
        sa.Column("extra",           postgresql.JSONB, server_default="{}"),
    )
    op.create_index("idx_users_email_active", "users", ["email", "is_active"])

    # ── api_keys ───────────────────────────────────────────────────────────────
    op.create_table(
        "api_keys",
        sa.Column("id",         postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id",    postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name",       sa.String(100),  nullable=False, server_default="default"),
        sa.Column("key_hash",   sa.String(255),  nullable=False),
        sa.Column("prefix",     sa.String(16),   nullable=False),
        sa.Column("scopes",     postgresql.JSONB, server_default='["read"]'),
        sa.Column("revoked",    sa.Boolean,       nullable=False, server_default="false"),
        sa.Column("last_used",  sa.DateTime,      nullable=True),
        sa.Column("created_at", sa.DateTime,      nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_api_keys_user", "api_keys", ["user_id"])

    # ── workspaces ────────────────────────────────────────────────────────────
    op.create_table(
        "workspaces",
        sa.Column("id",          postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name",        sa.String(255), nullable=False),
        sa.Column("slug",        sa.String(100), unique=True, nullable=False),
        sa.Column("description", sa.Text,        nullable=True),
        sa.Column("owner_id",    postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("settings",    postgresql.JSONB, server_default="{}"),
        sa.Column("is_active",   sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at",  sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at",  sa.DateTime, nullable=True),
    )

    # ── workspace_members ─────────────────────────────────────────────────────
    op.create_table(
        "workspace_members",
        sa.Column("id",           postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id",      postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id",      ondelete="CASCADE"), nullable=False),
        sa.Column("role",         sa.String(50), nullable=False, server_default="contributor"),
        sa.Column("invited_by",   postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("joined_at",    sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("workspace_id", "user_id", name="uq_workspace_member"),
    )

    # ── projects ──────────────────────────────────────────────────────────────
    op.create_table(
        "projects",
        sa.Column("id",                 postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id",       postgresql.UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name",               sa.String(255), nullable=False),
        sa.Column("description",        sa.Text, nullable=True),
        sa.Column("requirements",       sa.Text, nullable=True),
        sa.Column("tech_stack",         postgresql.JSONB, server_default="[]"),
        sa.Column("enabled_domains",    postgresql.JSONB, server_default='["architecture","development","testing","security"]'),
        sa.Column("deployment_enabled", sa.Boolean, server_default="false"),
        sa.Column("target_cloud",       sa.String(50), nullable=True),
        sa.Column("status",             sa.String(50), server_default="draft"),
        sa.Column("created_by",         postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at",         sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at",         sa.DateTime, nullable=True),
    )
    op.create_index("idx_projects_workspace", "projects", ["workspace_id"])

    # ── pipelines ─────────────────────────────────────────────────────────────
    op.create_table(
        "pipelines",
        sa.Column("id",            postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id",    postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version",       sa.Integer, nullable=False, server_default="1"),
        sa.Column("status",        sa.String(50), nullable=False, server_default="pending"),
        sa.Column("current_stage", sa.String(50), nullable=True),
        sa.Column("started_at",    sa.DateTime, nullable=True),
        sa.Column("completed_at",  sa.DateTime, nullable=True),
        sa.Column("triggered_by",  postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("config",        postgresql.JSONB, server_default="{}"),
        sa.Column("extra",         postgresql.JSONB, server_default="{}"),
        sa.Column("created_at",    sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_pipelines_project_status", "pipelines", ["project_id", "status"])

    # ── pipeline_stages ───────────────────────────────────────────────────────
    op.create_table(
        "pipeline_stages",
        sa.Column("id",               postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("pipeline_id",      postgresql.UUID(as_uuid=True), sa.ForeignKey("pipelines.id", ondelete="CASCADE"), nullable=False),
        sa.Column("stage_type",       sa.String(50), nullable=False),
        sa.Column("agent_domain",     sa.String(50), nullable=False),
        sa.Column("agent_level",      sa.String(50), nullable=False),
        sa.Column("status",           sa.String(50), server_default="pending"),
        sa.Column("order",            sa.Integer, nullable=False),
        sa.Column("started_at",       sa.DateTime, nullable=True),
        sa.Column("completed_at",     sa.DateTime, nullable=True),
        sa.Column("agent_output",     postgresql.JSONB, nullable=True),
        sa.Column("review_output",    postgresql.JSONB, nullable=True),
        sa.Column("approval_output",  postgresql.JSONB, nullable=True),
        sa.Column("approved_by",      postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("rejection_reason", sa.Text, nullable=True),
        sa.Column("retry_count",      sa.Integer, server_default="0"),
        sa.Column("input_data",       postgresql.JSONB, server_default="{}"),
        sa.Column("output_data",      postgresql.JSONB, server_default="{}"),
    )

    # ── artifacts ────────────────────────────────────────────────────────────
    op.create_table(
        "artifacts",
        sa.Column("id",            postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("pipeline_id",   postgresql.UUID(as_uuid=True), sa.ForeignKey("pipelines.id", ondelete="CASCADE"), nullable=False),
        sa.Column("stage_id",      postgresql.UUID(as_uuid=True), sa.ForeignKey("pipeline_stages.id"), nullable=False),
        sa.Column("artifact_type", sa.String(50), nullable=False),
        sa.Column("name",          sa.String(255), nullable=False),
        sa.Column("content",       sa.Text, nullable=True),
        sa.Column("file_path",     sa.String(500), nullable=True),
        sa.Column("checksum",      sa.String(64), nullable=True),
        sa.Column("version",       sa.Integer, server_default="1"),
        sa.Column("is_immutable",  sa.Boolean, server_default="false"),
        sa.Column("size_bytes",    sa.Integer, server_default="0"),
        sa.Column("extra",         postgresql.JSONB, server_default="{}"),
        sa.Column("created_at",    sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_artifacts_pipeline", "artifacts", ["pipeline_id"])

    # ── approval_requests ─────────────────────────────────────────────────────
    op.create_table(
        "approval_requests",
        sa.Column("id",                postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("stage_id",          postgresql.UUID(as_uuid=True), sa.ForeignKey("pipeline_stages.id"), nullable=False),
        sa.Column("pipeline_id",       postgresql.UUID(as_uuid=True), sa.ForeignKey("pipelines.id"), nullable=False),
        sa.Column("requested_by",      postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("required_role",     sa.String(50), nullable=False, server_default="manager"),
        sa.Column("status",            sa.String(50), server_default="pending"),
        sa.Column("decision",          sa.String(50), nullable=True),
        sa.Column("decided_by",        postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("decided_at",        sa.DateTime, nullable=True),
        sa.Column("notes",             sa.Text, nullable=True),
        sa.Column("notification_sent", sa.Boolean, server_default="false"),
        sa.Column("expires_at",        sa.DateTime, nullable=True),
        sa.Column("created_at",        sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # ── audit_logs ────────────────────────────────────────────────────────────
    op.create_table(
        "audit_logs",
        sa.Column("id",            postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id",       postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action",        sa.String(50), nullable=False),
        sa.Column("resource_type", sa.String(100), nullable=False),
        sa.Column("resource_id",   sa.String(255), nullable=True),
        sa.Column("workspace_id",  postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("ip_address",    sa.String(45), nullable=True),
        sa.Column("user_agent",    sa.String(500), nullable=True),
        sa.Column("request_id",    sa.String(100), nullable=True),
        sa.Column("details",       postgresql.JSONB, server_default="{}"),
        sa.Column("timestamp",     sa.DateTime, nullable=False, server_default=sa.func.now(), index=True),
    )
    op.create_index("idx_audit_logs_user_time", "audit_logs", ["user_id", "timestamp"])
    op.create_index("idx_audit_logs_resource",  "audit_logs", ["resource_type", "resource_id"])

    # ── event_store ───────────────────────────────────────────────────────────
    op.create_table(
        "event_store",
        sa.Column("id",              postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("aggregate_id",    sa.String(255), nullable=False),
        sa.Column("aggregate_type",  sa.String(100), nullable=False),
        sa.Column("event_type",      sa.String(100), nullable=False),
        sa.Column("event_data",      postgresql.JSONB, nullable=False),
        sa.Column("sequence_number", sa.Integer, nullable=False),
        sa.Column("occurred_at",     sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("extra",           postgresql.JSONB, server_default="{}"),
        sa.UniqueConstraint("aggregate_id", "sequence_number", name="uq_event_sequence"),
    )
    op.create_index("idx_event_store_aggregate", "event_store", ["aggregate_id", "sequence_number"])


def downgrade() -> None:
    for table in [
        "event_store", "audit_logs", "approval_requests", "artifacts",
        "pipeline_stages", "pipelines", "projects", "workspace_members",
        "workspaces", "api_keys", "users",
    ]:
        op.drop_table(table)
