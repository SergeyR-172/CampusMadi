import json
import logging
from datetime import datetime, timezone

from fastapi import FastAPI, Request
import time


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "method": getattr(record, "method", None),
            "path": getattr(record, "path", None),
            "status_code": getattr(record, "status_code", None),
            "client": getattr(record, "client", None),
            "duration_ms": getattr(record, "duration_ms", None),
        }

        return json.dumps(log_record, ensure_ascii=False)


def setup_logger() -> logging.Logger:
    logger = logging.getLogger("fastapi-logger")

    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)

    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())

    logger.addHandler(handler)
    logger.propagate = False

    return logger


logger = setup_logger()


def register_logging_middleware(app: FastAPI) -> None:
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start = time.perf_counter()

        try:
            response = await call_next(request)
            duration_ms = round((time.perf_counter() - start) * 1000, 2)

            logger.info(
                "request_finished",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "client": request.client.host if request.client else None,
                    "duration_ms": duration_ms,
                },
            )

            return response
        except Exception:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)

            logger.exception(
                "request_failed",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": 500,
                    "client": request.client.host if request.client else None,
                    "duration_ms": duration_ms,
                },
            )
            raise
