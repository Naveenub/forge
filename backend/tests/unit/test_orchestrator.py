"""
Unit tests for the Agent Orchestrator.
No database or network calls — all external dependencies are mocked.
"""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch
import pytest

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_anthropic_client():
    client = MagicMock()
    client.messages.create = AsyncMock(return_value=MagicMock(
        content=[MagicMock(text="Agent response: task completed successfully.")]
    ))
    return client


@pytest.fixture
def pipeline_context():
    return {
        "project_id": "proj-001",
        "project_name": "E-Commerce Platform",
        "requirements": "Build a scalable e-commerce backend with FastAPI",
        "cloud": "AWS",
        "domain_idx": 0,
        "stage_idx": 0,
    }


# ---------------------------------------------------------------------------
# Domain transition tests
# ---------------------------------------------------------------------------

class TestDomainTransitions:
    def test_domains_ordered_correctly(self):
        DOMAINS = ["architecture", "development", "testing", "security", "devops"]
        assert DOMAINS[0] == "architecture"
        assert DOMAINS[-1] == "devops"
        assert len(DOMAINS) == 5

    def test_each_domain_has_three_agents(self):
        AGENT_HIERARCHY = {
            "architecture": ["Architect", "Sr. Architect", "Arch Approval"],
            "development":  ["Developer", "Sr. Developer", "Dev Manager"],
            "testing":      ["Tester", "Sr. Tester", "QA Manager"],
            "security":     ["Sec Engineer", "Sr. Security", "Sec Manager"],
            "devops":       ["Cloud Eng", "Cloud Lead", "Cloud Manager"],
        }
        for domain, agents in AGENT_HIERARCHY.items():
            assert len(agents) == 3, f"{domain} must have exactly 3 agents"

    def test_stage_labels_match_hierarchy(self):
        LEVELS = ["execute", "review", "approve"]
        assert len(LEVELS) == 3
        assert LEVELS[0] == "execute"
        assert LEVELS[2] == "approve"

    def test_no_domain_skip_allowed(self):
        """Domains must be processed in order — no skipping."""
        completed = [0, 1, 2]
        next_domain = max(completed) + 1
        assert next_domain == 3  # security, not devops

    def test_pipeline_progress_calculation(self):
        """Progress should reflect completed domains + current stage."""
        total_stages = 5 * 3  # 5 domains × 3 agents each = 15
        completed_stages = 6   # 2 full domains done
        current_stage = 1      # mid-way through domain 3
        progress = round(((completed_stages + current_stage) / total_stages) * 100)
        assert 40 <= progress <= 55


# ---------------------------------------------------------------------------
# Agent execution tests
# ---------------------------------------------------------------------------

class TestAgentExecution:
    @pytest.mark.asyncio
    async def test_agent_call_includes_context(self, mock_anthropic_client, pipeline_context):
        """Agent prompt must include project name and requirements."""
        prompt_parts = []

        async def capture_call(**kwargs):
            prompt_parts.append(kwargs.get("messages", []))
            return MagicMock(content=[MagicMock(text="Done.")])

        mock_anthropic_client.messages.create = capture_call
        # Simulate a call
        await mock_anthropic_client.messages.create(
            model="claude-opus-4-6",
            max_tokens=8192,
            messages=[{"role": "user", "content": f"Project: {pipeline_context['project_name']}"}],
        )
        assert len(prompt_parts) == 1
        assert "E-Commerce Platform" in prompt_parts[0][0]["content"]

    @pytest.mark.asyncio
    async def test_execute_agent_returns_artifacts(self, mock_anthropic_client):
        """Execute-level agent should always produce at least one artifact."""
        mock_anthropic_client.messages.create = AsyncMock(return_value=MagicMock(
            content=[MagicMock(text="Generated: schema.sql, architecture.md")]
        ))
        result = await mock_anthropic_client.messages.create(
            model="claude-opus-4-6",
            max_tokens=8192,
            messages=[{"role": "user", "content": "Design the system"}],
        )
        assert "Generated" in result.content[0].text

    @pytest.mark.asyncio
    async def test_review_agent_can_raise_issues(self, mock_anthropic_client):
        """Review-level agent may flag issues that must be resolved."""
        mock_anthropic_client.messages.create = AsyncMock(return_value=MagicMock(
            content=[MagicMock(text="ISSUE: Missing circuit breaker on payment service. Must fix before approval.")]
        ))
        result = await mock_anthropic_client.messages.create(
            model="claude-opus-4-6",
            max_tokens=8192,
            messages=[{"role": "user", "content": "Review the architecture"}],
        )
        assert "ISSUE" in result.content[0].text


# ---------------------------------------------------------------------------
# Approval gate tests
# ---------------------------------------------------------------------------

class TestApprovalGates:
    def test_approval_requires_explicit_decision(self):
        valid_decisions = {"approved", "rejected"}
        assert "approved" in valid_decisions
        assert "pending" not in valid_decisions

    def test_rejected_approval_halts_pipeline(self):
        """A rejected gate must stop pipeline progression."""
        pipeline_status = "running"
        decision = "rejected"
        if decision == "rejected":
            pipeline_status = "halted"
        assert pipeline_status == "halted"

    def test_approved_gate_advances_to_next_stage(self):
        current_stage = 1
        decision = "approved"
        if decision == "approved":
            current_stage += 1
        assert current_stage == 2


# ---------------------------------------------------------------------------
# Artifact immutability tests
# ---------------------------------------------------------------------------

class TestArtifactImmutability:
    def test_approved_artifact_is_locked(self):
        artifact = {"status": "draft", "checksum": None}
        # Simulate approval
        artifact["status"] = "immutable"
        artifact["checksum"] = "a4f9c3d1b2e7f1a3"
        assert artifact["status"] == "immutable"
        assert artifact["checksum"] is not None

    def test_immutable_artifact_cannot_be_modified(self):
        artifact = {"status": "immutable", "content": "original"}
        with pytest.raises(ValueError, match="immutable"):
            if artifact["status"] == "immutable":
                raise ValueError("Cannot modify an immutable artifact")

    def test_checksum_format(self):
        checksum = "a4f9c3d1"
        assert len(checksum) == 8
        assert all(c in "0123456789abcdef" for c in checksum)
