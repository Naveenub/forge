"""
Kafka producer + consumer factory.
Topics: pipeline-events, agent-tasks, notifications.
"""
from __future__ import annotations

import json
import logging
from typing import Any, AsyncGenerator, Callable

from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from aiokafka.errors import KafkaConnectionError

from app.core.config import settings

logger = logging.getLogger(__name__)

_producer: AIOKafkaProducer | None = None


async def init_kafka() -> None:
    """Start shared Kafka producer and verify broker connectivity."""
    global _producer

    _producer = AIOKafkaProducer(
        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
        value_serializer=lambda v: json.dumps(v).encode(),
        key_serializer=lambda k: k.encode() if k else None,
        acks="all",                    # wait for all replicas
        enable_idempotence=True,
        max_in_flight_requests_per_connection=5,
        compression_type="gzip",
        linger_ms=5,
        request_timeout_ms=30_000,
        retry_backoff_ms=500,
    )

    await _producer.start()
    logger.info("Kafka producer started (bootstrap: %s)", settings.KAFKA_BOOTSTRAP_SERVERS)


async def close_kafka() -> None:
    if _producer:
        await _producer.stop()
    logger.info("Kafka producer stopped")


def get_producer() -> AIOKafkaProducer:
    if _producer is None:
        raise RuntimeError("Kafka not initialized — call init_kafka() first")
    return _producer


async def publish_event(topic: str, key: str | None, payload: dict[str, Any]) -> None:
    """Fire-and-forget publish helper. Swallows errors to avoid crashing callers."""
    try:
        await _producer.send_and_wait(topic, value=payload, key=key)  # type: ignore[union-attr]
    except Exception as exc:
        logger.warning("Kafka publish failed (topic=%s): %s", topic, exc)


# ── Convenience publish functions ─────────────────────────────────────────────

async def publish_pipeline_event(pipeline_id: str, event_type: str, data: dict) -> None:
    await publish_event(
        settings.KAFKA_TOPIC_PIPELINE_EVENTS,
        key=pipeline_id,
        payload={"pipeline_id": pipeline_id, "event_type": event_type, "data": data},
    )


async def publish_notification(user_id: str, notification: dict) -> None:
    await publish_event(
        settings.KAFKA_TOPIC_NOTIFICATIONS,
        key=user_id,
        payload=notification,
    )


# ── Consumer factory ──────────────────────────────────────────────────────────

def make_consumer(topics: list[str], group_id: str | None = None) -> AIOKafkaConsumer:
    return AIOKafkaConsumer(
        *topics,
        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
        group_id=group_id or settings.KAFKA_CONSUMER_GROUP,
        value_deserializer=lambda v: json.loads(v.decode()),
        auto_offset_reset="earliest",
        enable_auto_commit=False,
        session_timeout_ms=30_000,
        heartbeat_interval_ms=10_000,
    )


async def get_consumer(topic: str, group_id: str | None = None) -> AIOKafkaConsumer:
    """Create and start a consumer for the given topic."""
    consumer = make_consumer([topic], group_id=group_id or settings.KAFKA_CONSUMER_GROUP)
    try:
        await consumer.start()
    except KafkaConnectionError as exc:
        logger.warning("Kafka consumer could not connect: %s — worker will retry", exc)
    return consumer
