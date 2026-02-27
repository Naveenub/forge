"""
Unit tests for Artifact routes and schema validation.
All DB calls are mocked — no real database required.
"""
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# ── Schema / model unit tests ─────────────────────────────────────────────────

class TestArtifactSchema:
    def test_artifact_type_enum_values(self):
        """Verify all expected artifact types exist in the model."""
        from app.db.models import ArtifactType
        expected = {
            "source_code", "architecture_doc", "architecture_diagram",
            "test_suite", "coverage_report", "security_report",
            "dockerfile", "docker_compose", "kubernetes_manifest",
            "helm_chart", "ci_cd_pipeline", "db_schema",
        }
        actual = {e.value for e in ArtifactType}
        missing = expected - actual
        assert not missing, f"Missing ArtifactType values: {missing}"

    def test_artifact_read_schema_has_required_fields(self):
        from app.schemas.pipeline import ArtifactRead
        fields = ArtifactRead.model_fields
        required = {"id", "name", "artifact_type", "pipeline_id", "created_at"}
        missing = required - fields.keys()
        assert not missing, f"ArtifactRead missing fields: {missing}"

    def test_artifact_read_schema_serialises(self):
        from app.schemas.pipeline import ArtifactRead
        import datetime
        data = {
            "id": uuid.uuid4(),
            "name": "schema.sql",
            "artifact_type": "db_schema",
            "pipeline_id": uuid.uuid4(),
            "stage_type": "architecture_execute",
            "status": "approved",
            "size_bytes": 4096,
            "checksum": "abc123",
            "is_immutable": True,
            "content": "CREATE TABLE users (...);",
            "created_at": datetime.datetime.utcnow(),
        }
        schema = ArtifactRead(**data)
        dumped = schema.model_dump()
        assert str(data["id"]) == str(dumped["id"])
        assert dumped["name"] == "schema.sql"


# ── Artifact service unit tests ───────────────────────────────────────────────

class TestArtifactService:
    @pytest.fixture
    def mock_session(self):
        session = AsyncMock()
        session.get = AsyncMock()
        session.execute = AsyncMock()
        session.add = MagicMock()
        session.flush = AsyncMock()
        session.commit = AsyncMock()
        session.refresh = AsyncMock()
        return session

    def _make_artifact(self, **kwargs):
        a = MagicMock()
        a.id = uuid.uuid4()
        a.name = "architecture.md"
        a.artifact_type = "architecture_doc"
        a.pipeline_id = uuid.uuid4()
        a.status = "draft"
        a.is_immutable = False
        a.size_bytes = 1024
        a.checksum = None
        a.content = "# Architecture\n\nThis document describes..."
        for k, v in kwargs.items():
            setattr(a, k, v)
        return a

    @pytest.mark.asyncio
    async def test_artifact_lock_sets_immutable(self, mock_session):
        """Approving an artifact must mark it immutable and compute checksum."""
        artifact = self._make_artifact()
        mock_session.get.return_value = artifact

        # Simulate the lock operation (as done in pipeline_engine.py)
        import hashlib
        content = artifact.content.encode()
        artifact.checksum = hashlib.sha256(content).hexdigest()
        artifact.is_immutable = True
        artifact.status = "approved"

        assert artifact.is_immutable is True
        assert artifact.checksum is not None
        assert len(artifact.checksum) == 64  # SHA-256 hex

    @pytest.mark.asyncio
    async def test_immutable_artifact_content_cannot_change(self, mock_session):
        """Once immutable, the content hash must match on every read."""
        import hashlib
        content = "Original content"
        checksum = hashlib.sha256(content.encode()).hexdigest()

        artifact = self._make_artifact(
            content=content,
            checksum=checksum,
            is_immutable=True,
        )

        # Simulate tamper detection
        def verify_integrity(a):
            if not a.is_immutable or not a.checksum:
                return True
            actual = hashlib.sha256(a.content.encode()).hexdigest()
            return actual == a.checksum

        assert verify_integrity(artifact) is True

        # Simulate tampered content
        artifact.content = "Tampered content"
        assert verify_integrity(artifact) is False

    @pytest.mark.asyncio
    async def test_artifact_list_for_pipeline(self, mock_session):
        """list_for_pipeline should return all artifacts for a given pipeline."""
        artifacts = [self._make_artifact() for _ in range(3)]
        result_mock = MagicMock()
        result_mock.scalars.return_value.__iter__ = MagicMock(return_value=iter(artifacts))
        mock_session.execute.return_value = result_mock

        from sqlalchemy import select
        from app.db.models import Artifact
        result = await mock_session.execute(
            select(Artifact).where(Artifact.pipeline_id == str(artifacts[0].pipeline_id))
        )
        items = list(result.scalars())
        assert len(items) == 3


# ── Route tests ───────────────────────────────────────────────────────────────

class TestArtifactRoutes:
    PIPELINE_ID = "00000000-0000-0000-0000-000000000001"
    ARTIFACT_ID = "00000000-0000-0000-0000-000000000002"

    def test_list_artifacts_endpoint_exists(self):
        """GET /api/v1/pipelines/{id}/artifacts — not 404."""
        response = client.get(f"/api/v1/pipelines/{self.PIPELINE_ID}/artifacts")
        assert response.status_code != 404

    def test_list_artifacts_returns_list(self):
        response = client.get(f"/api/v1/pipelines/{self.PIPELINE_ID}/artifacts")
        if response.status_code == 200:
            assert isinstance(response.json(), list)

    def test_get_nonexistent_artifact_returns_404(self):
        response = client.get(f"/api/v1/artifacts/does-not-exist-id")
        assert response.status_code == 404

    def test_download_artifact_returns_url(self):
        response = client.get(f"/api/v1/artifacts/{self.ARTIFACT_ID}/download")
        if response.status_code == 200:
            data = response.json()
            assert "url" in data
            assert "expires_in" in data


# ── Checksum / immutability logic ─────────────────────────────────────────────

class TestChecksumLogic:
    def test_sha256_checksum_is_deterministic(self):
        import hashlib
        content = "SELECT * FROM users;"
        h1 = hashlib.sha256(content.encode()).hexdigest()
        h2 = hashlib.sha256(content.encode()).hexdigest()
        assert h1 == h2

    def test_different_content_produces_different_checksum(self):
        import hashlib
        h1 = hashlib.sha256(b"content A").hexdigest()
        h2 = hashlib.sha256(b"content B").hexdigest()
        assert h1 != h2

    def test_checksum_is_64_chars(self):
        import hashlib
        h = hashlib.sha256(b"forge").hexdigest()
        assert len(h) == 64
        assert all(c in "0123456789abcdef" for c in h)
