"""
WebSocket API - Real-time pipeline tracking
Broadcasts pipeline events to connected clients via WebSocket
"""
import asyncio
import json
import logging
from typing import Dict, Set
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from fastapi.websockets import WebSocketState

from app.core.auth import verify_ws_token
from app.core.events import EventBus, PipelineEvent

logger = logging.getLogger(__name__)
router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections per pipeline"""

    def __init__(self):
        # pipeline_id -> set of WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, pipeline_id: str) -> None:
        await websocket.accept()
        if pipeline_id not in self.active_connections:
            self.active_connections[pipeline_id] = set()
        self.active_connections[pipeline_id].add(websocket)
        logger.info(f"WebSocket connected: pipeline={pipeline_id}")

    def disconnect(self, websocket: WebSocket, pipeline_id: str) -> None:
        if pipeline_id in self.active_connections:
            self.active_connections[pipeline_id].discard(websocket)
            if not self.active_connections[pipeline_id]:
                del self.active_connections[pipeline_id]
        logger.info(f"WebSocket disconnected: pipeline={pipeline_id}")

    async def broadcast_to_pipeline(self, pipeline_id: str, message: dict) -> None:
        """Send message to all clients watching a specific pipeline"""
        if pipeline_id not in self.active_connections:
            return

        dead_connections = set()
        for connection in self.active_connections[pipeline_id].copy():
            try:
                if connection.client_state == WebSocketState.CONNECTED:
                    await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send to WebSocket: {e}")
                dead_connections.add(connection)

        # Clean up dead connections
        self.active_connections[pipeline_id] -= dead_connections


manager = ConnectionManager()


@router.websocket("/pipeline/{pipeline_id}")
async def pipeline_websocket(
    websocket: WebSocket,
    pipeline_id: str,
    token: str = Query(...),
):
    """WebSocket endpoint for real-time pipeline tracking"""
    # Verify JWT token
    user = await verify_ws_token(token)
    if not user:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await manager.connect(websocket, pipeline_id)

    # Subscribe to pipeline events
    event_bus = EventBus.get_instance()
    queue = asyncio.Queue()

    async def event_handler(event: PipelineEvent):
        if event.pipeline_id == pipeline_id:
            await queue.put(event)

    event_bus.subscribe(event_handler)

    try:
        # Send connection confirmation
        await websocket.send_json({
            "type": "connected",
            "pipeline_id": pipeline_id,
            "message": "Real-time pipeline tracking active"
        })

        # Process events and handle ping/pong
        while True:
            try:
                # Check for events with timeout
                event = await asyncio.wait_for(queue.get(), timeout=30.0)
                await websocket.send_json({
                    "type": event.event_type,
                    "pipeline_id": event.pipeline_id,
                    "stage_id": event.stage_id,
                    "data": event.data,
                    "timestamp": event.timestamp.isoformat(),
                })
            except asyncio.TimeoutError:
                # Send heartbeat
                if websocket.client_state == WebSocketState.CONNECTED:
                    await websocket.send_json({"type": "heartbeat"})
                else:
                    break

    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected from pipeline {pipeline_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        event_bus.unsubscribe(event_handler)
        manager.disconnect(websocket, pipeline_id)


async def notify_pipeline_update(pipeline_id: str, event_type: str, data: dict) -> None:
    """Utility function to broadcast pipeline updates"""
    await manager.broadcast_to_pipeline(pipeline_id, {
        "type": event_type,
        "pipeline_id": pipeline_id,
        "data": data,
    })
