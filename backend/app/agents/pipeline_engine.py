"""
Pipeline Workflow State Machine
Enforces strict enterprise SDLC governance with immutable stage transitions
"""
import asyncio
import logging
from datetime import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.orchestrator import create_agent
from app.core.events import EventBus, PipelineEvent
from app.core.notifications import NotificationService
from app.db.models import (
    AgentDomain,
    AgentLevel,
    Artifact,
    ArtifactType,
    Pipeline,
    PipelineStage,
    PipelineStatus,
    StageType,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# Stage Configuration
# ─────────────────────────────────────────────────────────────

# fmt: off
PIPELINE_STAGES = [
    # Architecture Domain
    {"stage_type": StageType.ARCHITECTURE,          "domain": AgentDomain.ARCHITECTURE, "level": AgentLevel.EXECUTION, "order": 1},  # noqa: E501
    {"stage_type": StageType.ARCHITECTURE_REVIEW,   "domain": AgentDomain.ARCHITECTURE, "level": AgentLevel.REVIEW,    "order": 2},  # noqa: E501
    {"stage_type": StageType.ARCHITECTURE_APPROVAL, "domain": AgentDomain.ARCHITECTURE, "level": AgentLevel.APPROVAL,  "order": 3},  # noqa: E501
    # Development Domain
    {"stage_type": StageType.DEVELOPMENT,           "domain": AgentDomain.DEVELOPMENT,  "level": AgentLevel.EXECUTION, "order": 4},  # noqa: E501
    {"stage_type": StageType.DEVELOPMENT_REVIEW,    "domain": AgentDomain.DEVELOPMENT,  "level": AgentLevel.REVIEW,    "order": 5},  # noqa: E501
    {"stage_type": StageType.DEVELOPMENT_APPROVAL,  "domain": AgentDomain.DEVELOPMENT,  "level": AgentLevel.APPROVAL,  "order": 6},  # noqa: E501
    # Testing Domain
    {"stage_type": StageType.TESTING,               "domain": AgentDomain.TESTING,      "level": AgentLevel.EXECUTION, "order": 7},  # noqa: E501
    {"stage_type": StageType.TESTING_REVIEW,        "domain": AgentDomain.TESTING,      "level": AgentLevel.REVIEW,    "order": 8},  # noqa: E501
    {"stage_type": StageType.TESTING_APPROVAL,      "domain": AgentDomain.TESTING,      "level": AgentLevel.APPROVAL,  "order": 9},  # noqa: E501
    # Security Domain
    {"stage_type": StageType.SECURITY,              "domain": AgentDomain.SECURITY,     "level": AgentLevel.EXECUTION, "order": 10},  # noqa: E501
    {"stage_type": StageType.SECURITY_REVIEW,       "domain": AgentDomain.SECURITY,     "level": AgentLevel.REVIEW,    "order": 11},  # noqa: E501
    {"stage_type": StageType.SECURITY_APPROVAL,     "domain": AgentDomain.SECURITY,     "level": AgentLevel.APPROVAL,  "order": 12},  # noqa: E501
    # DevOps Domain (Optional)
    {"stage_type": StageType.DEVOPS,                "domain": AgentDomain.DEVOPS,       "level": AgentLevel.EXECUTION, "order": 13, "optional": True},  # noqa: E501
    {"stage_type": StageType.DEVOPS_REVIEW,         "domain": AgentDomain.DEVOPS,       "level": AgentLevel.REVIEW,    "order": 14, "optional": True},  # noqa: E501
    {"stage_type": StageType.DEVOPS_APPROVAL,       "domain": AgentDomain.DEVOPS,       "level": AgentLevel.APPROVAL,  "order": 15, "optional": True},  # noqa: E501
]
# fmt: on


# ─────────────────────────────────────────────────────────────
# Pipeline State Machine
# ─────────────────────────────────────────────────────────────

class PipelineStateMachine:
    """
    Orchestrates the complete SDLC pipeline with strict stage enforcement.
    No stage may proceed without required approval from previous stage.
    """

    VALID_TRANSITIONS = {
        PipelineStatus.PENDING: [PipelineStatus.RUNNING],
        PipelineStatus.RUNNING: [
            PipelineStatus.WAITING_APPROVAL, PipelineStatus.FAILED, PipelineStatus.COMPLETED
        ],
        PipelineStatus.WAITING_APPROVAL: [PipelineStatus.APPROVED, PipelineStatus.REJECTED],
        PipelineStatus.APPROVED: [PipelineStatus.RUNNING, PipelineStatus.COMPLETED],
        PipelineStatus.REJECTED: [PipelineStatus.RUNNING],  # Retry after fix
        PipelineStatus.FAILED: [PipelineStatus.RUNNING],    # Retry
    }

    def __init__(self, pipeline_id: str, db: AsyncSession):
        self.pipeline_id = pipeline_id
        self.db = db
        self.event_bus = EventBus.get_instance()
        self.notifications = NotificationService()
        self.context: dict[str, Any] = {}  # Shared context across stages

    async def run(self) -> None:
        """Execute the full pipeline"""
        pipeline = await self._get_pipeline()
        project = await pipeline.awaitable_attrs.project

        logger.info(f"Starting pipeline {self.pipeline_id} for project {project.name}")

        # Initialize context from project
        self.context = {
            "project_name": project.name,
            "requirements": project.requirements,
            "enabled_domains": project.enabled_domains,
            "deployment_enabled": project.deployment_enabled,
            "target_cloud": project.target_cloud,
            "scale_requirement": "1M+ requests/day",
        }

        await self._transition_pipeline(PipelineStatus.RUNNING, pipeline)

        stages = sorted(pipeline.stages, key=lambda s: s.order)

        for stage in stages:
            # Skip optional devops stages if deployment not enabled
            if stage.agent_domain == AgentDomain.DEVOPS and not project.deployment_enabled:
                logger.info(f"Skipping DevOps stage {stage.stage_type} - deployment not enabled")
                continue

            try:
                success = await self._execute_stage(stage, pipeline)
                if not success:
                    await self._transition_pipeline(PipelineStatus.FAILED, pipeline)
                    return
            except Exception as e:
                logger.error(f"Pipeline {self.pipeline_id} failed at stage {stage.stage_type}: {e}")
                await self._handle_stage_failure(stage, pipeline, str(e))
                return

        # All stages complete
        pipeline.status = PipelineStatus.COMPLETED
        pipeline.completed_at = datetime.utcnow()
        await self.db.commit()

        await self.event_bus.publish(PipelineEvent(
            pipeline_id=self.pipeline_id,
            event_type="pipeline_completed",
            data={"project_name": project.name}
        ))

        logger.info(f"Pipeline {self.pipeline_id} completed successfully!")

    async def _execute_stage(self, stage: PipelineStage, pipeline: Pipeline) -> bool:
        """Execute a single pipeline stage with retry logic"""
        logger.info(f"Executing stage: {stage.stage_type} (order: {stage.order})")

        stage.status = PipelineStatus.RUNNING
        stage.started_at = datetime.utcnow()
        pipeline.current_stage = stage.stage_type
        await self.db.commit()

        await self.event_bus.publish(PipelineEvent(
            pipeline_id=self.pipeline_id,
            stage_id=str(stage.id),
            event_type="stage_started",
            data={"stage_type": stage.stage_type, "order": stage.order}
        ))

        max_retries = 3
        for attempt in range(max_retries):
            try:
                # Create and run the appropriate agent
                agent = create_agent(stage.stage_type, self.pipeline_id, str(stage.id))
                output = await agent.execute(self.context)

                # Store output and update context
                stage.agent_output = output
                self._update_context(stage.stage_type, output)

                # Handle approval stages
                if stage.agent_level == AgentLevel.APPROVAL:
                    approved = output.get("approved", False)
                    if not approved:
                        stage.status = PipelineStatus.REJECTED
                        stage.rejection_reason = output.get(
                            "approval_notes", "Rejected by approval agent"
                        )
                        await self.db.commit()

                        # Notify for human intervention on rejection
                        await self.notifications.send_rejection_alert(
                            pipeline_id=self.pipeline_id,
                            stage_type=stage.stage_type,
                            reason=stage.rejection_reason
                        )
                        logger.warning(
                            "Stage %s rejected: %s", stage.stage_type, stage.rejection_reason
                        )
                        return False

                # Save artifact
                await self._save_artifact(stage, output)

                stage.status = (
                    PipelineStatus.APPROVED
                    if stage.agent_level == AgentLevel.APPROVAL
                    else PipelineStatus.COMPLETED
                )
                stage.completed_at = datetime.utcnow()
                await self.db.commit()

                await self.event_bus.publish(PipelineEvent(
                    pipeline_id=self.pipeline_id,
                    stage_id=str(stage.id),
                    event_type="stage_completed",
                    data={"stage_type": stage.stage_type, "status": stage.status}
                ))

                return True

            except Exception as e:
                stage.retry_count += 1
                logger.warning(f"Stage {stage.stage_type} attempt {attempt+1} failed: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                else:
                    raise

        return False

    def _update_context(self, stage_type: StageType, output: dict[str, Any]) -> None:
        """Update shared context with stage outputs for downstream agents"""
        context_mapping = {
            StageType.ARCHITECTURE: "architecture_output",
            StageType.ARCHITECTURE_REVIEW: "architecture_review",
            StageType.ARCHITECTURE_APPROVAL: "approved_blueprint",
            StageType.DEVELOPMENT: "development_output",
            StageType.DEVELOPMENT_REVIEW: "dev_review",
            StageType.DEVELOPMENT_APPROVAL: "approved_code",
            StageType.TESTING: "testing_output",
            StageType.TESTING_REVIEW: "testing_review",
            StageType.TESTING_APPROVAL: "qa_clearance",
            StageType.SECURITY: "security_output",
            StageType.SECURITY_REVIEW: "security_review",
            StageType.SECURITY_APPROVAL: "security_clearance",
            StageType.DEVOPS: "devops_output",
            StageType.DEVOPS_REVIEW: "devops_review",
            StageType.DEVOPS_APPROVAL: "deployment_approval",
        }
        context_key = context_mapping.get(stage_type)
        if context_key:
            self.context[context_key] = output

    async def _save_artifact(self, stage: PipelineStage, output: dict[str, Any]) -> None:
        """Save immutable artifact for completed stage"""
        artifact_type_mapping = {
            StageType.ARCHITECTURE: ArtifactType.ARCHITECTURE_DOC,
            StageType.DEVELOPMENT: ArtifactType.SOURCE_CODE,
            StageType.TESTING: ArtifactType.TEST_SUITE,
            StageType.SECURITY: ArtifactType.SECURITY_REPORT,
            StageType.DEVOPS: ArtifactType.DOCKERFILE,
        }
        artifact_type = artifact_type_mapping.get(stage.stage_type)
        if not artifact_type:
            return

        import hashlib
        import json
        content = json.dumps(output)
        checksum = hashlib.sha256(content.encode()).hexdigest()

        artifact = Artifact(
            pipeline_id=stage.pipeline_id,
            stage_id=stage.id,
            artifact_type=artifact_type,
            name=f"{stage.stage_type}_{datetime.utcnow().isoformat()}",
            content=content,
            checksum=checksum,
            is_immutable=stage.agent_level == AgentLevel.APPROVAL,
        )
        self.db.add(artifact)
        await self.db.flush()

    async def _transition_pipeline(self, new_status: PipelineStatus, pipeline: Pipeline) -> None:
        """Validate and apply state transition"""
        valid_next = self.VALID_TRANSITIONS.get(pipeline.status, [])
        if new_status not in valid_next:
            raise ValueError(f"Invalid transition: {pipeline.status} → {new_status}")
        pipeline.status = new_status
        await self.db.commit()

    async def _get_pipeline(self) -> Pipeline:
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload
        result = await self.db.execute(
            select(Pipeline)
            .where(Pipeline.id == self.pipeline_id)
            .options(
                selectinload(Pipeline.stages),
                selectinload(Pipeline.project)
            )
        )
        return result.scalar_one()

    async def _handle_stage_failure(
        self, stage: PipelineStage, pipeline: Pipeline, error: str
    ) -> None:
        stage.status = PipelineStatus.FAILED
        pipeline.status = PipelineStatus.FAILED
        await self.db.commit()
        await self.notifications.send_failure_alert(
            pipeline_id=self.pipeline_id,
            stage_type=stage.stage_type,
            error=error
        )


async def create_pipeline_stages(
    pipeline: Pipeline, enabled_domains: list[str], deployment_enabled: bool, db: AsyncSession
) -> None:
    """Create all pipeline stages based on enabled domains"""
    for stage_config in PIPELINE_STAGES:
        domain = stage_config["domain"]
        is_optional = stage_config.get("optional", False)

        # Skip disabled domains
        if domain.value not in enabled_domains:
            continue

        # Skip deployment stages if not enabled
        if is_optional and not deployment_enabled:
            continue

        stage = PipelineStage(
            pipeline_id=pipeline.id,
            stage_type=stage_config["stage_type"],
            agent_domain=stage_config["domain"],
            agent_level=stage_config["level"],
            order=stage_config["order"],
            status=PipelineStatus.PENDING,
        )
        db.add(stage)

    await db.flush()
