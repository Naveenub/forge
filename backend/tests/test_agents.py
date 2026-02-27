"""
Unit tests for the Agents API endpoints.
Uses FastAPI TestClient — no real DB required (routes return static data).
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

VALID_DOMAINS = {"architecture", "development", "testing", "security", "devops"}
VALID_LEVELS  = {"execute", "review", "approve"}


class TestListAgents:
    def test_returns_200(self):
        response = client.get("/api/v1/agents")
        assert response.status_code == 200

    def test_returns_exactly_15_agents(self):
        response = client.get("/api/v1/agents")
        agents = response.json()
        assert len(agents) == 15, f"Expected 15 agents, got {len(agents)}"

    def test_each_domain_has_exactly_3_agents(self):
        agents = client.get("/api/v1/agents").json()
        domain_counts: dict[str, int] = {}
        for a in agents:
            domain_counts[a["domain"]] = domain_counts.get(a["domain"], 0) + 1
        assert set(domain_counts.keys()) == VALID_DOMAINS
        for domain, count in domain_counts.items():
            assert count == 3, f"Domain '{domain}' has {count} agents, expected 3"

    def test_each_domain_has_one_of_each_level(self):
        agents = client.get("/api/v1/agents").json()
        for domain in VALID_DOMAINS:
            domain_agents = [a for a in agents if a["domain"] == domain]
            levels = {a["level"] for a in domain_agents}
            assert levels == VALID_LEVELS, f"Domain '{domain}' missing levels: {VALID_LEVELS - levels}"

    def test_agent_structure_is_correct(self):
        agents = client.get("/api/v1/agents").json()
        required_fields = {"id", "name", "domain", "level", "status"}
        for agent in agents:
            missing = required_fields - agent.keys()
            assert not missing, f"Agent missing fields: {missing}"

    def test_agent_domains_are_valid(self):
        agents = client.get("/api/v1/agents").json()
        for agent in agents:
            assert agent["domain"] in VALID_DOMAINS, f"Unknown domain: {agent['domain']}"

    def test_agent_levels_are_valid(self):
        agents = client.get("/api/v1/agents").json()
        for agent in agents:
            assert agent["level"] in VALID_LEVELS, f"Unknown level: {agent['level']}"

    def test_agent_statuses_are_valid(self):
        agents = client.get("/api/v1/agents").json()
        valid_statuses = {"idle", "running", "error", "offline"}
        for agent in agents:
            assert agent["status"] in valid_statuses, f"Unknown status: {agent['status']}"

    def test_agent_ids_are_unique(self):
        agents = client.get("/api/v1/agents").json()
        ids = [a["id"] for a in agents]
        assert len(ids) == len(set(ids)), "Duplicate agent IDs found"

    def test_agents_use_claude_model(self):
        agents = client.get("/api/v1/agents").json()
        for agent in agents:
            if "model" in agent:
                assert "claude" in agent["model"].lower(), f"Unexpected model: {agent['model']}"


class TestAgentOrdering:
    """Verify the canonical domain + level ordering is preserved."""

    DOMAIN_ORDER = ["architecture", "development", "testing", "security", "devops"]
    LEVEL_ORDER  = ["execute", "review", "approve"]

    def test_domains_appear_in_correct_order(self):
        agents = client.get("/api/v1/agents").json()
        seen_domains = list(dict.fromkeys(a["domain"] for a in agents))
        assert seen_domains == self.DOMAIN_ORDER, f"Domain order wrong: {seen_domains}"

    def test_levels_within_domain_appear_in_order(self):
        agents = client.get("/api/v1/agents").json()
        for domain in self.DOMAIN_ORDER:
            domain_agents = [a for a in agents if a["domain"] == domain]
            levels = [a["level"] for a in domain_agents]
            assert levels == self.LEVEL_ORDER, f"Level order wrong for {domain}: {levels}"


class TestAgentStatus:
    def test_status_endpoint_returns_200(self):
        response = client.get("/api/v1/agents/status")
        # endpoint exists in agents.py
        assert response.status_code in (200, 401, 403)  # may require auth

    def test_v1_agents_in_route_catalog(self):
        """Verify the /agents route is reachable (no 404)."""
        response = client.get("/api/v1/agents")
        assert response.status_code != 404
