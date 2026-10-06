"""
Dev-only diagnostic logging.

Use `dev_log()` for any log line that exists purely to give developers
visibility into local/mock behavior (e.g. what an outbound payload would
have looked like). It is a no-op unless `settings.DEBUG` is true, so these
lines never appear in staging/production regardless of log level config.

Do not use this for anything that should be observable in production
(errors, warnings about real failures) — use the standard logger directly
for those.
"""

from __future__ import annotations

import logging

from django.conf import settings


def dev_log(logger: logging.Logger, message: str, *args, level: int = logging.INFO, **kwargs) -> None:
    if not settings.DEBUG:
        return
    logger.log(level, message, *args, **kwargs)
