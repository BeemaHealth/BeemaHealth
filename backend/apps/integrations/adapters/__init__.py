"""Network adapter registry."""
from __future__ import annotations

from typing import Any

from apps.integrations.adapters.base import NetworkAdapter
from apps.integrations.adapters.beluga import BelugaAdapter
from apps.integrations.exceptions import NotConfigured

NETWORK_ADAPTERS: dict[str, type[NetworkAdapter]] = {"beluga": BelugaAdapter}


def get_network_adapter(organization: Any = None) -> NetworkAdapter:
    """Adapter for a network ``Organization`` (``integration_adapter`` key). Defaults to Beluga."""
    key = (getattr(organization, "integration_adapter", "") or "beluga").strip().lower()
    try:
        return NETWORK_ADAPTERS[key]()
    except KeyError as exc:
        raise NotConfigured(f"No network adapter registered for key {key}") from exc
