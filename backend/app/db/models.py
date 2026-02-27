"""
SQLAlchemy ORM models for Forge.
All tables in one file for easy cross-reference.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Index, Integer,
    String, Text, UniqueConstraint,
    Enum as SQLEnum, func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, relationship


# ─────────────────────────────────────────────────────────────────────────────
# Base
# ─────────────────────────────────────────────────────────────────────────────

class Base(DeclarativeBase):
    pass


# ─────────────────────────────────────────────────────────────────────────────
# Enums
# ─────────────────────────────────────────────────────────────────────────────

class UserRole(str, Enum):
    OWNER       = "owner"
    ADMIN       = "admin"
    MANAGER     = "manager"
    CONTRIBUTOR = "contributor"
    VIEWER      = "viewer"


class PipelineStatus(str, Enum):
    PENDING           = "pending"
    RUNNING           = "running"
    WAITING_APPROVAL  = "waiting_approval"
    APPROVED          = "approved"
    REJECTED          = "rejected"
    COMPLETED         = "completed"
    FAILED            = "failed"
    PAUSED            = "paused"


class StageType(str, Enum):
    ARCHITECTURE         = "architecture"
    ARCHITECTURE_REVIEW  = "architecture_review"
    ARCHITECTURE_APPROVAL= "architecture_approval"
    DEVELOPMENT          = "development"
    DEVELOPMENT_REVIEW   = "development_review"
    DEVELOPMENT_APPROVAL = "development_approval"
    TESTING              = "testing"
    TESTING_REVIEW       = "testing_review"
    TESTING_APPROVAL     = "testing_approval"
    SECURITY             = "security"
    SECURITY_REVIEW      = "security_review"
    SECURITY_APPROVAL    = "security_approval"
    DEVOPS               = "devops"
    DEVOPS_REVIEW        = "devops_review"
    DEVOPS_APPROVAL      = "devops_approval"
    DEPLOYMENT           = "deployment"


class AgentLevel(str, Enum):
    EXECUTION = "execution"
    REVIEW    = "review"
    APPROVAL  = "approval"


class AgentDomain(str, Enum):
    ARCHITECTURE = "architecture"
    DEVELOPMENT  = "development"
    TESTING      = "testing"
    SECURITY     = "security"
    DEVOPS       = "devops"


class ArtifactType(str, Enum):
    ARCHITECTURE_DOC    = "architecture_doc"
    ARCHITECTURE_DIAGRAM= "architecture_diagram"
    SOURCE_CODE         = "source_code"
    TEST_SUITE          = "test_suite"
    COVERAGE_REPORT     = "coverage_report"
    SECURITY_REPORT     = "security_report"
    DOCKERFILE          = "dockerfile"
    DOCKER_COMPOSE      = "docker_compose"
    KUBERNETES_MANIFEST = "kubernetes_manifest"
    HELM_CHART          = "helm_chart"
    CI_CD_PIPELINE      = "ci_cd_pipeline"
    DB_SCHEMA           = "db_schema"
    ARCH_DOC            = "arch_doc"


class AuditAction(str, Enum):
    CREATE  = "create"
    READ    = "read"
    UPDATE  = "update"
    DELETE  = "delete"
    APPROVE = "approve"
    REJECT  = "reject"
    DEPLOY  = "deploy"
    LOGIN   = "login"
    LOGOUT  = "logout"


# ─────────────────────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email           = Column(String(255), unique=True, nullable=False, index=True)
    username        = Column(String(100), unique=True, nullable=False)
    name            = Column(String(255), nullable=False, default="")
    hashed_password = Column(String(255), nullable=False)
    role            = Column(SQLEnum(UserRole), nullable=False, default=UserRole.CONTRIBUTOR)
    avatar          = Column(String(4), nullable=True)   # 2-char initials, e.g. "JD"
    is_active       = Column(Boolean, default=True)
    is_verified     = Column(Boolean, default=False)
    otp_secret      = Column(String(32), nullable=True)
    otp_expires_at  = Column(DateTime, nullable=True)
    last_login      = Column(DateTime, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    extra           = Column(JSONB, default={})

    workspace_memberships = relationship("WorkspaceMember", back_populates="user", foreign_keys="WorkspaceMember.user_id")
    audit_logs            = relationship("AuditLog", back_populates="user")
    api_keys              = relationship("ApiKey", back_populates="user")

    __table_args__ = (
        Index("idx_users_email_active", "email", "is_active"),
    )


class ApiKey(Base):
    __tablename__ = "api_keys"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name       = Column(String(100), nullable=False, default="default")
    key_hash   = Column(String(255), nullable=False)          # bcrypt hash of raw key
    prefix     = Column(String(16), nullable=False)           # first 8 chars for display
    scopes     = Column(JSONB, default=["read"])              # list of scope strings
    revoked    = Column(Boolean, default=False, nullable=False)
    last_used  = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="api_keys")

    __table_args__ = (
        Index("idx_api_keys_user", "user_id"),
    )


class Workspace(Base):
    __tablename__ = "workspaces"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name        = Column(String(255), nullable=False)
    slug        = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    owner_id    = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    settings    = Column(JSONB, default={})
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner    = relationship("User", foreign_keys=[owner_id])
    members  = relationship("WorkspaceMember", back_populates="workspace")
    projects = relationship("Project", back_populates="workspace")


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id      = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role         = Column(SQLEnum(UserRole), nullable=False, default=UserRole.CONTRIBUTOR)
    invited_by   = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    joined_at    = Column(DateTime, default=datetime.utcnow)

    workspace = relationship("Workspace", back_populates="members")
    user      = relationship("User", foreign_keys=[user_id], back_populates="workspace_memberships")

    __table_args__ = (
        UniqueConstraint("workspace_id", "user_id", name="uq_workspace_member"),
    )


class Project(Base):
    __tablename__ = "projects"

    id                 = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id       = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name               = Column(String(255), nullable=False)
    description        = Column(Text, nullable=True)
    requirements       = Column(Text, nullable=True)
    tech_stack         = Column(JSONB, default=[])
    enabled_domains    = Column(JSONB, default=["architecture", "development", "testing", "security"])
    deployment_enabled = Column(Boolean, default=False)
    target_cloud       = Column(String(50), nullable=True)
    status             = Column(String(50), default="draft")
    created_by         = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at         = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at         = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    workspace = relationship("Workspace", back_populates="projects")
    creator   = relationship("User", foreign_keys=[created_by])
    pipelines = relationship("Pipeline", back_populates="project")

    __table_args__ = (
        Index("idx_projects_workspace", "workspace_id"),
    )


class Pipeline(Base):
    __tablename__ = "pipelines"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id    = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    version       = Column(Integer, default=1, nullable=False)
    status        = Column(SQLEnum(PipelineStatus), default=PipelineStatus.PENDING, nullable=False)
    current_stage = Column(SQLEnum(StageType), nullable=True)
    started_at    = Column(DateTime, nullable=True)
    completed_at  = Column(DateTime, nullable=True)
    triggered_by  = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    config        = Column(JSONB, default={})
    extra         = Column(JSONB, default={})
    created_at    = Column(DateTime, default=datetime.utcnow, nullable=False)

    project   = relationship("Project", back_populates="pipelines")
    stages    = relationship("PipelineStage", back_populates="pipeline", order_by="PipelineStage.order")
    artifacts = relationship("Artifact", back_populates="pipeline")

    __table_args__ = (
        Index("idx_pipelines_project_status", "project_id", "status"),
    )


class PipelineStage(Base):
    __tablename__ = "pipeline_stages"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pipeline_id     = Column(UUID(as_uuid=True), ForeignKey("pipelines.id", ondelete="CASCADE"), nullable=False)
    stage_type      = Column(SQLEnum(StageType), nullable=False)
    agent_domain    = Column(SQLEnum(AgentDomain), nullable=False)
    agent_level     = Column(SQLEnum(AgentLevel), nullable=False)
    status          = Column(SQLEnum(PipelineStatus), default=PipelineStatus.PENDING)
    order           = Column(Integer, nullable=False)
    started_at      = Column(DateTime, nullable=True)
    completed_at    = Column(DateTime, nullable=True)
    agent_output    = Column(JSONB, nullable=True)
    review_output   = Column(JSONB, nullable=True)
    approval_output = Column(JSONB, nullable=True)
    approved_by     = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    rejection_reason= Column(Text, nullable=True)
    retry_count     = Column(Integer, default=0)
    input_data      = Column(JSONB, default={})
    output_data     = Column(JSONB, default={})

    pipeline = relationship("Pipeline", back_populates="stages")
    approver = relationship("User", foreign_keys=[approved_by])


class Artifact(Base):
    __tablename__ = "artifacts"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pipeline_id   = Column(UUID(as_uuid=True), ForeignKey("pipelines.id", ondelete="CASCADE"), nullable=False)
    stage_id      = Column(UUID(as_uuid=True), ForeignKey("pipeline_stages.id"), nullable=False)
    artifact_type = Column(SQLEnum(ArtifactType), nullable=False)
    name          = Column(String(255), nullable=False)
    content       = Column(Text, nullable=True)
    file_path     = Column(String(500), nullable=True)
    checksum      = Column(String(64), nullable=True)
    version       = Column(Integer, default=1)
    is_immutable  = Column(Boolean, default=False)
    size_bytes    = Column(Integer, default=0)
    extra         = Column(JSONB, default={})
    created_at    = Column(DateTime, default=datetime.utcnow, nullable=False)

    pipeline = relationship("Pipeline", back_populates="artifacts")
    stage    = relationship("PipelineStage")

    __table_args__ = (
        Index("idx_artifacts_pipeline", "pipeline_id"),
    )


class ApprovalRequest(Base):
    """Governance gate — blocks pipeline until a human approves or rejects."""
    __tablename__ = "approval_requests"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    stage_id          = Column(UUID(as_uuid=True), ForeignKey("pipeline_stages.id"), nullable=False)
    pipeline_id       = Column(UUID(as_uuid=True), ForeignKey("pipelines.id"), nullable=False)
    requested_by      = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    required_role     = Column(SQLEnum(UserRole), nullable=False, default=UserRole.MANAGER)
    status            = Column(String(50), default="pending")     # pending | approved | rejected
    decision          = Column(String(50), nullable=True)
    decided_by        = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    decided_at        = Column(DateTime, nullable=True)
    notes             = Column(Text, nullable=True)
    notification_sent = Column(Boolean, default=False)
    expires_at        = Column(DateTime, nullable=True)
    created_at        = Column(DateTime, default=datetime.utcnow, nullable=False)

    stage    = relationship("PipelineStage")
    pipeline = relationship("Pipeline")

# Alias so code that imports "Approval" still works
Approval = ApprovalRequest


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id       = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action        = Column(SQLEnum(AuditAction), nullable=False)
    resource_type = Column(String(100), nullable=False)
    resource_id   = Column(String(255), nullable=True)
    workspace_id  = Column(UUID(as_uuid=True), nullable=True)
    ip_address    = Column(String(45), nullable=True)
    user_agent    = Column(String(500), nullable=True)
    request_id    = Column(String(100), nullable=True)
    details       = Column(JSONB, default={})
    timestamp     = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = relationship("User", back_populates="audit_logs")

    __table_args__ = (
        Index("idx_audit_logs_user_time", "user_id", "timestamp"),
        Index("idx_audit_logs_resource",  "resource_type", "resource_id"),
    )


class EventStore(Base):
    """Immutable event log for event sourcing."""
    __tablename__ = "event_store"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    aggregate_id    = Column(String(255), nullable=False, index=True)
    aggregate_type  = Column(String(100), nullable=False)
    event_type      = Column(String(100), nullable=False)
    event_data      = Column(JSONB, nullable=False)
    sequence_number = Column(Integer, nullable=False)
    occurred_at     = Column(DateTime, default=datetime.utcnow, nullable=False)
    extra           = Column(JSONB, default={})

    __table_args__ = (
        UniqueConstraint("aggregate_id", "sequence_number", name="uq_event_sequence"),
        Index("idx_event_store_aggregate", "aggregate_id", "sequence_number"),
    )


# ── Backward-compat shims ─────────────────────────────────────────────────────
from app.core.database import get_db, get_write_db, get_read_db  # noqa: F401, E402
