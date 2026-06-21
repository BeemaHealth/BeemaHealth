from django.conf import settings

from apps.pharmacy.adapters.lifefile import MediVeraLifeFileAdapter
from apps.pharmacy.adapters.mock import MockPharmacyAdapter, OpenLoopPharmacyAdapter


def get_pharmacy_adapter(partner: str | None = None):
    slug = (partner or getattr(settings, "PHARMACY_ADAPTER", "mock")).lower()
    if slug in ("mock", ""):
        return MockPharmacyAdapter()
    if slug in ("medivera", "lifefile"):
        return MediVeraLifeFileAdapter()
    if slug == "openloop":
        return OpenLoopPharmacyAdapter()
    return MockPharmacyAdapter()
