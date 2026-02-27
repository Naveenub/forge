"""
OpenTelemetry distributed tracing.
Instruments FastAPI, SQLAlchemy, and Redis automatically.

Usage in main.py lifespan:
    from app.core.telemetry import setup_tracing
    setup_tracing(app)
"""
from __future__ import annotations

from app.core.logging import get_logger

logger = get_logger(__name__)


def setup_tracing(app=None, service_name: str = "forge-backend") -> None:  # noqa: ANN001
    """
    Configure OpenTelemetry SDK and auto-instrumentation.

    If the optional OTLP packages are not installed, logs a warning and
    continues (graceful degradation — tracing is non-critical at startup).

    Install all optional deps with:
        pip install opentelemetry-sdk opentelemetry-exporter-otlp-proto-grpc \\
                    opentelemetry-instrumentation-fastapi \\
                    opentelemetry-instrumentation-sqlalchemy \\
                    opentelemetry-instrumentation-redis
    """
    try:
        from opentelemetry import trace
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor  # noqa: F401

        resource = Resource.create({"service.name": service_name})
        provider = TracerProvider(resource=resource)

        _setup_exporter(provider)

        trace.set_tracer_provider(provider)
        logger.info("OpenTelemetry tracing configured", extra={"service": service_name})

        if app is not None:
            _instrument_app(app)

    except ImportError:
        logger.warning(
            "opentelemetry-sdk not installed — distributed tracing disabled. "
            "Install with: pip install opentelemetry-sdk opentelemetry-exporter-otlp-proto-grpc"
        )


def _setup_exporter(provider) -> None:  # noqa: ANN001
    """Attach an OTLP gRPC exporter if available, else fall back to console."""
    try:
        import os

        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk.trace.export import BatchSpanProcessor  # noqa: F401

        endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")
        exporter = OTLPSpanExporter(endpoint=endpoint, insecure=True)
        provider.add_span_processor(BatchSpanProcessor(exporter))
        logger.info("OTLP trace exporter configured", extra={"endpoint": endpoint})

    except ImportError:
        try:
            # Fallback: discard spans silently (no console spam in production)
            logger.debug("OTLP exporter not available; spans will be dropped")
        except ImportError:
            pass


def _instrument_app(app) -> None:  # noqa: ANN001
    """Auto-instrument FastAPI and SQLAlchemy if instrumentation packages present."""
    try:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        FastAPIInstrumentor.instrument_app(app)
        logger.info("FastAPI auto-instrumented with OpenTelemetry")
    except ImportError:
        pass

    try:
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
        SQLAlchemyInstrumentor().instrument()
        logger.info("SQLAlchemy auto-instrumented with OpenTelemetry")
    except ImportError:
        pass

    try:
        from opentelemetry.instrumentation.redis import RedisInstrumentor
        RedisInstrumentor().instrument()
        logger.info("Redis auto-instrumented with OpenTelemetry")
    except ImportError:
        pass


def get_tracer(name: str = "forge"):
    """Return an OpenTelemetry Tracer. Falls back to a no-op tracer if SDK absent."""
    try:
        from opentelemetry import trace
        return trace.get_tracer(name)
    except ImportError:
        class _NoOpSpan:
            def __enter__(self): return self
            def __exit__(self, *_): pass
            def set_attribute(self, *_): pass
            def record_exception(self, *_): pass

        class _NoOpTracer:
            def start_as_current_span(self, *_, **__):
                return _NoOpSpan()

        return _NoOpTracer()
