"""Per-IP throttles for the anonymous questionnaire endpoints."""
from __future__ import annotations

from typing import Any

from rest_framework.throttling import SimpleRateThrottle


class _IpThrottle(SimpleRateThrottle):
    def get_cache_key(self, request: Any, view: Any) -> str:
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class StartThrottle(_IpThrottle):
    scope = "questionnaire_start"
    rate = "20/hour"


class AnswerThrottle(_IpThrottle):
    scope = "questionnaire_answer"
    rate = "120/min"


class UploadThrottle(_IpThrottle):
    scope = "questionnaire_upload"
    rate = "30/hour"
