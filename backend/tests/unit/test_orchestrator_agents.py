"""
Unit tests for the orchestrator agent classes.
Covers agent instantiation, prompt building, and execution flow.
"""
from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch
import uuid

import pytest

from app.agents.orchestrator import (
    ArchitectAgent,
    SeniorArchitectAgent,
    ArchitectureApprovalAgent,
    DeveloperAgent,
    SeniorDeveloperAgent,
    DevManagerApprovalAgent,
    TesterAgent,
    SeniorTesterAgent,
    QAManagerApprovalAgent,
    SecurityEngineerAgent,
    SeniorSecurityAgent,
    SecurityManagerApprovalAgent,
    CloudEngineerAgent,
    CloudTeamLeadAgent,
    CloudManagerApprovalAgent,
    create_agent,
    AGENT_REGISTRY,
)
from app.db.models import StageType


PIPELINE_ID = str(uuid.uuid4())
STAGE_ID = str(uuid.uuid4())

SAMPLE_CONTEXT = {
    "project_name": "TestProject",
    "requirements": "Build a REST API",
    "tech_stack": ["Python", "FastAPI"],
    "artifacts": {},
}


# ── Agent instantiation ───────────────────────────────────────────────────────

class TestAgentInstantiation:
    def test_architect_agent_created(self):
        agent = ArchitectAgent(PIPELINE_ID, STAGE_ID)
        assert agent.agent_name == "Architect Agent"
        assert "architecture" in agent.system_prompt.lower()

    def test_senior_architect_agent_created(self):
        agent = SeniorArchitectAgent(PIPELINE_ID, STAGE_ID)
        assert "senior" in agent.agent_name.lower() or "architect" in agent.agent_name.lower()

    def test_architecture_approval_agent_created(self):
        agent = ArchitectureApprovalAgent(PIPELINE_ID, STAGE_ID)
        assert "approv" in agent.agent_name.lower() or "architect" in agent.agent_name.lower()

    def test_developer_agent_created(self):
        agent = DeveloperAgent(PIPELINE_ID, STAGE_ID)
        assert agent.agent_name is not None
        assert agent.system_prompt is not None

    def test_tester_agent_created(self):
        agent = TesterAgent(PIPELINE_ID, STAGE_ID)
        assert agent.agent_name is not None

    def test_all_agents_have_prompts(self):
        agent_classes = [
            ArchitectAgent, SeniorArchitectAgent, ArchitectureApprovalAgent,
            DeveloperAgent, SeniorDeveloperAgent, DevManagerApprovalAgent,
            TesterAgent, SeniorTesterAgent, QAManagerApprovalAgent,
            SecurityEngineerAgent, SeniorSecurityAgent, SecurityManagerApprovalAgent,
            CloudEngineerAgent, CloudTeamLeadAgent, CloudManagerApprovalAgent,
        ]
        for cls in agent_classes:
            agent = cls(PIPELINE_ID, STAGE_ID)
            assert len(agent.system_prompt) > 50, f"{cls.__name__} system_prompt too short"
            assert len(agent.agent_name) > 3, f"{cls.__name__} agent_name too short"


# ── Prompt building ───────────────────────────────────────────────────────────

class TestPromptBuilding:
    def test_architect_prompt_includes_requirements(self):
        agent = ArchitectAgent(PIPELINE_ID, STAGE_ID)
        prompt = agent._build_prompt(SAMPLE_CONTEXT)
        assert "REST API" in prompt or "requirements" in prompt.lower()

    def test_developer_prompt_includes_context(self):
        agent = DeveloperAgent(PIPELINE_ID, STAGE_ID)
        prompt = agent._build_prompt(SAMPLE_CONTEXT)
        assert isinstance(prompt, str)
        assert len(prompt) > 10

    def test_tester_prompt_is_string(self):
        agent = TesterAgent(PIPELINE_ID, STAGE_ID)
        prompt = agent._build_prompt(SAMPLE_CONTEXT)
        assert isinstance(prompt, str)


# ── Response parsing ──────────────────────────────────────────────────────────

class TestResponseParsing:
    def test_base_parse_response_wraps_content(self):
        agent = ArchitectAgent(PIPELINE_ID, STAGE_ID)
        result = agent._parse_response("some output")
        assert "content" in result

    def test_parse_response_with_json(self):
        agent = ArchitectureApprovalAgent(PIPELINE_ID, STAGE_ID)
        json_str = json.dumps({"approved": True, "summary": "Looks good"})
        result = agent._parse_response(json_str)
        assert isinstance(result, dict)


# ── Agent execution ───────────────────────────────────────────────────────────

class TestAgentExecution:
    @pytest.mark.asyncio
    async def test_execute_calls_claude_and_returns_dict(self):
        agent = ArchitectAgent(PIPELINE_ID, STAGE_ID)

        mock_response = MagicMock()
        mock_response.content = [MagicMock(text='{"design": "Use microservices"}')]
        agent.client = MagicMock()
        agent.client.messages.create = AsyncMock(return_value=mock_response)
        agent.event_bus = MagicMock()
        agent.event_bus.publish = AsyncMock()

        result = await agent.execute(SAMPLE_CONTEXT)
        assert isinstance(result, dict)

    @pytest.mark.asyncio
    async def test_execute_publishes_events(self):
        agent = DeveloperAgent(PIPELINE_ID, STAGE_ID)

        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="Implementation complete")]
        agent.client = MagicMock()
        agent.client.messages.create = AsyncMock(return_value=mock_response)
        agent.event_bus = MagicMock()
        agent.event_bus.publish = AsyncMock()

        await agent.execute(SAMPLE_CONTEXT)
        assert agent.event_bus.publish.call_count >= 2  # started + completed

    @pytest.mark.asyncio
    async def test_execute_publishes_failure_event_on_error(self):
        agent = TesterAgent(PIPELINE_ID, STAGE_ID)
        agent.client = MagicMock()
        agent.client.messages.create = AsyncMock(side_effect=RuntimeError("API down"))
        agent.event_bus = MagicMock()
        agent.event_bus.publish = AsyncMock()

        with pytest.raises(RuntimeError):
            await agent.execute(SAMPLE_CONTEXT)

        # Check failure event was published
        calls = [str(c) for c in agent.event_bus.publish.call_args_list]
        assert any("failed" in c for c in calls)


# ── Factory ───────────────────────────────────────────────────────────────────

class TestAgentFactory:
    def test_registry_has_15_entries(self):
        assert len(AGENT_REGISTRY) == 15

    def test_create_agent_returns_correct_type(self):
        agent = create_agent(StageType.ARCHITECTURE, PIPELINE_ID, STAGE_ID)
        assert isinstance(agent, ArchitectAgent)

    def test_create_agent_unknown_raises(self):
        with pytest.raises(ValueError):
            create_agent("nonexistent_stage_type", PIPELINE_ID, STAGE_ID)  # type: ignore[arg-type]

    def test_all_stage_types_have_agents(self):
        for stage_type in AGENT_REGISTRY:
            agent = create_agent(stage_type, PIPELINE_ID, STAGE_ID)
            assert agent is not None