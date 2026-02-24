"""
Unit tests for REST API routes.
Uses FastAPI TestClient — no real DB or Kafka.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from app.main import app

client = TestClient(app)


class TestHealth:
    def test_health_returns_200(self):
        response = client.get("/api/v1/health")
        assert response.status_code == 200

    def test_health_contains_agent_count(self):
        response = client.get("/api/v1/health")
        data = response.json()
        assert data["agents"] == 15
        assert data["domains"] == 5
        assert data["status"] == "ok"


class TestWorkspaces:
    def test_create_workspace_returns_201(self):
        response = client.post("/api/v1/workspaces", json={"name": "Test Team", "color": "#00d4ff"})
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Team"
        assert "id" in data

    def test_create_workspace_requires_name(self):
        response = client.post("/api/v1/workspaces", json={"color": "#00d4ff"})
        assert response.status_code == 422

    def test_workspace_name_cannot_be_empty(self):
        response = client.post("/api/v1/workspaces", json={"name": ""})
        assert response.status_code == 422

    def test_list_workspaces_returns_200(self):
        response = client.get("/api/v1/workspaces")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestProjects:
    def test_create_project_returns_201(self):
        response = client.post(
            "/api/v1/workspaces/ws-001/projects",
            json={"name": "My Service", "description": "Test project", "cloud": "AWS", "workspace_id": "ws-001"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "My Service"
        assert data["status"] == "pending"
        assert data["progress"] == 0

    def test_project_starts_in_architecture_domain(self):
        response = client.post(
            "/api/v1/workspaces/ws-001/projects",
            json={"name": "New Service", "workspace_id": "ws-001"},
        )
        data = response.json()
        assert data["domain"] == "architecture"

    def test_get_nonexistent_project_returns_404(self):
        response = client.get("/api/v1/projects/does-not-exist")
        assert response.status_code == 404


class TestPipelines:
    def test_start_pipeline_returns_201(self):
        response = client.post(
            "/api/v1/pipelines",
            json={"project_id": "proj-001", "triggered_by": "user"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "running"
        assert data["active_domain"] == "architecture"
        assert data["active_stage"] == 0
        assert data["progress"] == 0

    def test_cancel_pipeline(self):
        response = client.post("/api/v1/pipelines/pipe-001/cancel")
        assert response.status_code == 200
        assert response.json()["status"] == "cancelled"


class TestApprovals:
    def test_approve_decision(self):
        response = client.post(
            "/api/v1/approvals/APR-001/decide",
            json={"decision": "approved", "comment": "LGTM"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["decision"] == "approved"

    def test_reject_decision(self):
        response = client.post(
            "/api/v1/approvals/APR-001/decide",
            json={"decision": "rejected", "comment": "Needs rework"},
        )
        assert response.status_code == 200
        assert response.json()["decision"] == "rejected"

    def test_invalid_decision_returns_422(self):
        response = client.post(
            "/api/v1/approvals/APR-001/decide",
            json={"decision": "maybe"},
        )
        assert response.status_code == 422


class TestAgents:
    def test_list_agents_returns_15(self):
        response = client.get("/api/v1/agents")
        assert response.status_code == 200
        agents = response.json()
        assert len(agents) == 15

    def test_each_domain_has_3_agents(self):
        response = client.get("/api/v1/agents")
        agents = response.json()
        domains: dict[str, int] = {}
        for agent in agents:
            domains[agent["domain"]] = domains.get(agent["domain"], 0) + 1
        for domain, count in domains.items():
            assert count == 3, f"Domain {domain} should have 3 agents"

    def test_agent_levels_are_valid(self):
        response = client.get("/api/v1/agents")
        valid_levels = {"execute", "review", "approve"}
        for agent in response.json():
            assert agent["level"] in valid_levels


class TestMetrics:
    def test_workspace_metrics_returns_data(self):
        response = client.get("/api/v1/metrics/workspace/ws-001")
        assert response.status_code == 200
        data = response.json()
        assert "pods" in data
        assert "kafka_lag" in data
        assert "uptime_30d_pct" in data
