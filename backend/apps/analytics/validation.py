from __future__ import annotations

from apps.analytics.models import ALLOWED_EVENT_NAMES, ALLOWED_PROPERTY_KEYS


def sanitize_event_properties(properties: dict | None) -> dict:
    if not properties:
        return {}
    if not isinstance(properties, dict):
        raise ValueError("properties must be an object.")
    cleaned: dict = {}
    for key, value in properties.items():
        if key not in ALLOWED_PROPERTY_KEYS:
            raise ValueError(f"Property key not allowed: {key}")
        if isinstance(value, bool):
            cleaned[key] = value
        elif isinstance(value, int):
            cleaned[key] = value
        elif isinstance(value, float):
            cleaned[key] = int(value)
        elif isinstance(value, str) and len(value) <= 64:
            cleaned[key] = value
        else:
            raise ValueError(f"Invalid property value for {key}")
    return cleaned


def validate_event_name(event_name: str) -> str:
    name = (event_name or "").strip()
    if name not in ALLOWED_EVENT_NAMES:
        raise ValueError(f"Event name not allowed: {name}")
    return name
