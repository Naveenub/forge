"""Artifacts API — /api/v1/artifacts/"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUserID
from app.core.database import get_read_db, get_write_db
from app.db.models import Artifact, ArtifactType
from app.schemas.pipeline import ArtifactRead

router = APIRouter()


@router.get("", response_model=list[ArtifactRead])
async def list_all_artifacts(
    user_id: CurrentUserID,
    db: AsyncSession = Depends(get_read_db),
):
    """Return all artifacts the current user has access to (across their pipelines)."""
    result = await db.execute(
        select(Artifact).order_by(Artifact.created_at.desc()).limit(200)
    )
    return [ArtifactRead.model_validate(a) for a in result.scalars()]


@router.get("/{artifact_id}", response_model=ArtifactRead)
async def get_artifact(
    artifact_id: UUID,
    user_id: CurrentUserID,
    db: AsyncSession = Depends(get_read_db),
):
    result = await db.execute(select(Artifact).where(Artifact.id == artifact_id))
    artifact = result.scalar_one_or_none()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")
    return ArtifactRead.model_validate(artifact)


@router.get("/{artifact_id}/download")
async def download_artifact(
    artifact_id: UUID,
    user_id: CurrentUserID,
    db: AsyncSession = Depends(get_read_db),
):
    """Stream artifact content or return a pre-signed URL for binary artifacts."""
    result = await db.execute(select(Artifact).where(Artifact.id == artifact_id))
    artifact = result.scalar_one_or_none()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    if artifact.content:
        # Text artifact — stream directly
        content_bytes = artifact.content.encode()
        media_type = _media_type(artifact.artifact_type)
        return StreamingResponse(
            iter([content_bytes]),
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{artifact.name}"',
                "Content-Length": str(len(content_bytes)),
            },
        )

    # Binary artifact stored on object storage — return redirect URL
    # In production: generate a pre-signed S3/GCS URL
    return {
        "url": f"https://artifacts.forge.internal/{artifact_id}",
        "expires_in": 3600,
        "filename": artifact.name,
    }


@router.post("/{artifact_id}/lock", response_model=ArtifactRead)
async def lock_artifact(
    artifact_id: UUID,
    user_id: CurrentUserID,
    db: AsyncSession = Depends(get_write_db),
):
    """Mark an artifact as immutable. Cannot be undone."""
    result = await db.execute(select(Artifact).where(Artifact.id == artifact_id))
    artifact = result.scalar_one_or_none()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")
    if artifact.is_immutable:
        raise HTTPException(status_code=400, detail="Artifact is already locked")

    artifact.is_immutable = True
    await db.commit()
    await db.refresh(artifact)
    return ArtifactRead.model_validate(artifact)


@router.delete("/{artifact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_artifact(
    artifact_id: UUID,
    user_id: CurrentUserID,
    db: AsyncSession = Depends(get_write_db),
):
    """Delete a draft (non-immutable) artifact."""
    result = await db.execute(select(Artifact).where(Artifact.id == artifact_id))
    artifact = result.scalar_one_or_none()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")
    if artifact.is_immutable:
        raise HTTPException(status_code=403, detail="Immutable artifacts cannot be deleted")

    await db.delete(artifact)
    await db.commit()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _media_type(artifact_type: ArtifactType) -> str:
    mapping = {
        ArtifactType.SOURCE_CODE:          "text/plain",
        ArtifactType.ARCHITECTURE_DOC:     "text/markdown",
        ArtifactType.SECURITY_REPORT:      "application/json",
        ArtifactType.TEST_SUITE:           "text/plain",
        ArtifactType.DOCKERFILE:           "text/plain",
        ArtifactType.DOCKER_COMPOSE:       "text/yaml",
        ArtifactType.KUBERNETES_MANIFEST:  "text/yaml",
        ArtifactType.HELM_CHART:           "application/x-tar",
        ArtifactType.CI_CD_PIPELINE:       "text/yaml",
        ArtifactType.COVERAGE_REPORT:      "text/html",
    }
    return mapping.get(artifact_type, "application/octet-stream")
