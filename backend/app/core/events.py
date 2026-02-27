"""
In-process event bus.
WebSocket handlers subscribe to pipeline events; the pipeline engine publishes them.
Events are also forwarded to Kafka for cross-process fan-out.
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Coroutine
from uuid import uuid4

logger = logging.getLogger(__name__)

Handler = Callable[["PipelineEvent"], Coroutine[Any, Any, None]]


@dataclass
class PipelineEvent:
    pipeline_id: str
    event_type:  str
    data:        dict[str, Any]
    stage_id:    str | None = None
    timestamp:   datetime   = field(default_factory=lambda: datetime.now(timezone.utc))
    event_id:    str        = field(default_factory=lambda: str(uuid4()))


class EventBus:
    """
    Singleton in-process pub/sub bus.

    Subscribers receive every event; filter by pipeline_id inside your handler.
    Events that fail to deliver to a handler are logged and silently dropped
    (one subscriber crash must not affect others).
    """

    _instance: "EventBus | None" = None

    def __init__(self) -> None:
        self._handlers: list[Handler] = []
        self._lock = asyncio.Lock()

    @classmethod
    def get_instance(cls) -> "EventBus":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def subscribe(self, handler: Handler) -> None:
        if handler not in self._handlers:
            self._handlers.append(handler)
            logger.debug("EventBus: subscriber added (%d total)", len(self._handlers))

    def unsubscribe(self, handler: Handler) -> None:
        try:
            self._handlers.remove(handler)
            logger.debug("EventBus: subscriber removed (%d total)", len(self._handlers))
        except ValueError:
            pass

    async def publish(self, event: PipelineEvent) -> None:
        """Fan-out event to all subscribers concurrently."""
        if not self._handlers:
            return

        results = await asyncio.gather(
            *(self._safe_call(h, event) for h in list(self._handlers)),
            return_exceptions=True,
        )

        for result in results:
            if isinstance(result, Exception):
                logger.warning("EventBus handler raised: %s", result)

        # Also forward to Kafka (non-blocking)
        asyncio.create_task(self._forward_kafka(event))

    @staticmethod
    async def _safe_call(handler: Handler, event: PipelineEvent) -> None:
        try:
            await handler(event)
        except Exception as exc:
            raise exc

    @staticmethod
    async def _forward_kafka(event: PipelineEvent) -> None:
        try:
            from app.core.kafka_client import publish_pipeline_event
            await publish_pipeline_event(
                event.pipeline_id,
                event.event_type,
                {"stage_id": event.stage_id, **event.data},
            )
        except Exception as exc:
            logger.debug("Kafka forward skipped: %s", exc)
