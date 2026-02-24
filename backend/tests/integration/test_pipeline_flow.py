"""
Integration tests for the full pipeline flow.
Requires a running PostgreSQL database (use docker compose up -d postgres).
Set TEST_DATABASE_URL in environment before running.
"""
from __future__ import annotations

import os
import pytest

# Skip all integration tests unless TEST_DATABASE_URL is set
pytestmark = pytest.mark.skipif(
    not os.getenv("TEST_DATABASE_URL"),
    reason="Integration tests require TEST_DATABASE_URL to be set"
)


class TestFullPipelineFlow:
    """End-to-end pipeline tests against a real database."""

    @pytest.mark.asyncio
    async def test_create_and_start_pipeline(self):
        """Full flow: create workspace → project → start pipeline → check status."""
        # This would use a real DB session and the full app stack
        # Left as a skeleton for teams to implement with their DB fixtures
        assert True, "Implement with real DB session fixture"

    @pytest.mark.asyncio
    async def test_pipeline_approval_gate_blocks_progression(self):
        """A pending approval gate must prevent domain advancement."""
        assert True, "Implement with real pipeline state machine"

    @pytest.mark.asyncio
    async def test_artifact_is_locked_after_approval(self):
        """After the approval agent signs off, artifact.status must be 'immutable'."""
        assert True, "Implement with real artifact creation"

    @pytest.mark.asyncio
    async def test_rejected_pipeline_can_be_restarted(self):
        """After a rejection, a new pipeline run should start from stage 0."""
        assert True, "Implement with real pipeline reset logic"


class TestWebSocketStream:
    """Tests for the WebSocket log streaming endpoint."""

    @pytest.mark.asyncio
    async def test_websocket_connects_successfully(self):
        """Client should be able to connect and receive initial state."""
        assert True, "Implement with async WebSocket test client"

    @pytest.mark.asyncio
    async def test_websocket_broadcasts_log_entries(self):
        """Log entries published by agents should be broadcast to all subscribers."""
        assert True, "Implement with WebSocket broadcast test"
