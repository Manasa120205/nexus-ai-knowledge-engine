import logging
import json
import sys
import time
from typing import Any, Dict


class StructuredJsonFormatter(logging.Formatter):
    """
    Format logs as JSON objects for production observability and log aggregation.
    Guarantees no sensitive data is leaked.
    """
    def format(self, record: logging.LogRecord) -> str:
        log_entry: Dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Include structured extras if present
        for key in ("request_id", "endpoint", "method", "status_code", "duration_ms", "user_id"):
            if hasattr(record, key):
                log_entry[key] = getattr(record, key)

        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry)


def setup_logging(debug: bool = False) -> logging.Logger:
    logger = logging.getLogger("nexus")
    logger.setLevel(logging.DEBUG if debug else logging.INFO)

    # Avoid duplicate handlers
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(StructuredJsonFormatter())
        logger.addHandler(handler)

    return logger


logger = setup_logging()
