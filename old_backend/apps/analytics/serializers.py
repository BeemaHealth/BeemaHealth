from __future__ import annotations

import re

from rest_framework import serializers

from apps.analytics.models import LandingPage

_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")
_UTM_RE = re.compile(r"^[a-zA-Z0-9_\-\.]{0,128}$")


def _validate_utm(value: str, field: str) -> str:
    value = str(value or "").strip()[:128]
    if value and not _UTM_RE.match(value):
        raise serializers.ValidationError({field: "Invalid characters in UTM value."})
    return value


class LandingPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = LandingPage
        fields = [
            "id", "slug", "name", "headline", "subheadline",
            "utm_source", "utm_medium", "utm_campaign", "utm_content",
            "redirect_to_home", "active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_slug(self, value: str) -> str:
        value = str(value).strip().lower()
        if not _SLUG_RE.match(value):
            raise serializers.ValidationError(
                "Slug must be lowercase letters, numbers, hyphens, or underscores."
            )
        return value

    def validate_utm_source(self, value):
        return _validate_utm(value, "utm_source")

    def validate_utm_medium(self, value):
        return _validate_utm(value, "utm_medium")

    def validate_utm_campaign(self, value):
        return _validate_utm(value, "utm_campaign")

    def validate_utm_content(self, value):
        return _validate_utm(value, "utm_content")

    def validate_name(self, value: str) -> str:
        value = str(value).strip()[:128]
        if not value:
            raise serializers.ValidationError("Name is required.")
        return value

    def validate_headline(self, value: str) -> str:
        return str(value or "").strip()[:256]

    def validate_subheadline(self, value: str) -> str:
        return str(value or "").strip()[:512]
