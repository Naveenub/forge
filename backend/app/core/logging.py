"""
Structured JSON logging for production observability.
Emits correlation-ID-tagged JSON lines compatible with Loki / CloudWatch / GCP Logging.
"""
from __future__ import annotations

import json
import logging
import sys
import time
import uuid
from contextvars import ContextVar
from typing import Any

# Per-request correlation ID stored in context variable
request_id_var: ContextVar[str] = ContextVar("request_id", default="")


class JSONFormatter(logging.Formatter):
    """Emit log records as single-line JSON objects."""

    RESERVED = {"msg", "message", "args", "exc_info", "exc_text", "stack_info"}

    def format(self, record: logging.LogRecord) -> str:
        log: dict[str, Any] = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(record.created)),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
            "module": record.module,
            "line": record.lineno,
        }

        rid = request_id_var.get("")
        if rid:
            log["request_id"] = rid

        # Attach any extra fields passed via logger.info("…", extra={…})
        for key, val in record.__dict__.items():
            if key not in logging.LogRecord.__dict__ and key not in self.RESERVED:
                log[key] = val

        if record.exc_info:
            log["exc_info"] = self.formatException(record.exc_info)

        return json.dumps(log, default=str)


def configure_logging(level: str = "INFO", json_logs: bool = True) -> None:
    """
    Call once at startup (in lifespan) to configure root + uvicorn loggers.

    Args:
        level:      Log level string, e.g. "DEBUG", "INFO", "WARNING".
        json_logs:  True in staging/production; False for pretty local output.
    """
    handler = logging.StreamHandler(sys.stdout)
    if json_logs:
        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s  %(levelname)-8s  %(name)s:%(lineno)d  %(message)s",
                datefmt="%H:%M:%S",
            )
        )

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)

    # Suppress noisy third-party loggers
    for name in ("uvicorn.access", "sqlalchemy.engine", "kafka"):
        logging.getLogger(name).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Return a named logger; use at module level: logger = get_logger(__name__)."""
    return logging.getLogger(name)


def new_request_id() -> str:
    """Generate a short request correlation ID and set it on the context var."""
    rid = uuid.uuid4().hex[:12]
    request_id_var.set(rid)
    return rid
