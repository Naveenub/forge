"""
Pipeline Worker — background task consuming the 'pipeline-events' Kafka topic
and driving PipelineStateMachine instances.

Each message contains {"event_type": "pipeline_queued", "pipeline_id": "<uuid>"}.
Concurrent execution is bounded by a semaphore (DB_POOL_SIZE / 2).
"""
from __future__ import annotations

import asyncio
import logging
from uuid import UUID

from app.agents.pipeline_engine import PipelineStateMachine
from app.core.config import settings
from app.core.database import write_session
from app.core.kafka_client import get_consumer

logger = logging.getLogger(__name__)

_semaphore = asyncio.Semaphore(max(5, settings.DB_POOL_SIZE // 2))
_active_tasks: dict[str, asyncio.Task] = {}


async def start_pipeline_worker() -> None:
    """Long-running coroutine. Started once in the app lifespan."""
    logger.info("Pipeline worker starting…")

    consumer = await get_consumer(
        topic=settings.KAFKA_TOPIC_PIPELINE_EVENTS,
        group_id=settings.KAFKA_CONSUMER_GROUP,
    )

    try:
        async for message in consumer:
            event = message.value   # JSON already deserialized by kafka_client

            if event.get("event_type") != "pipeline_queued":
                continue

            pipeline_id = event.get("pipeline_id")
            if not pipeline_id or pipeline_id in _active_tasks:
                continue

            task = asyncio.create_task(
                _run_pipeline(pipeline_id),
                name=f"pipeline-{pipeline_id}",
            )
            _active_tasks[pipeline_id] = task
            task.add_done_callback(lambda t, pid=pipeline_id: _active_tasks.pop(pid, None))

    except asyncio.CancelledError:
        logger.info("Pipeline worker cancelled — shutting down")
    except Exception as exc:
        logger.exception("Pipeline worker fatal error: %s", exc)
    finally:
        await consumer.stop()
        await _cancel_all()


async def run_pipeline_direct(pipeline_id: str | UUID) -> None:
    """
    Bypass Kafka and start a pipeline immediately.
    Called from the REST layer when a pipeline is created.
    """
    pipeline_id = str(pipeline_id)
    if pipeline_id in _active_tasks:
        logger.warning("Pipeline %s already running — skipping duplicate", pipeline_id)
        return

    task = asyncio.create_task(
        _run_pipeline(pipeline_id),
        name=f"pipeline-{pipeline_id}",
    )
    _active_tasks[pipeline_id] = task
    task.add_done_callback(lambda t, pid=pipeline_id: _active_tasks.pop(pid, None))


async def _run_pipeline(pipeline_id: str) -> None:
    async with _semaphore:
        logger.info("Executing pipeline: %s", pipeline_id)
        async with write_session() as db:
            try:
                machine = PipelineStateMachine(pipeline_id, db)
                await machine.run()
                logger.info("Pipeline %s completed", pipeline_id)
            except asyncio.CancelledError:
                logger.warning("Pipeline %s was cancelled", pipeline_id)
                raise
            except Exception as exc:
                logger.exception("Pipeline %s failed: %s", pipeline_id, exc)


async def _cancel_all() -> None:
    tasks = list(_active_tasks.values())
    for task in tasks:
        task.cancel()
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)
    logger.info("Cancelled %d pipeline tasks on shutdown", len(tasks))


def get_active_pipeline_count() -> int:
    return len(_active_tasks)


def is_pipeline_running(pipeline_id: str) -> bool:
    return str(pipeline_id) in _active_tasks
