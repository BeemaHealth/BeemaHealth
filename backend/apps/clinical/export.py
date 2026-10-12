"""Clinical section of the patient data export (registered in ``ClinicalConfig.ready``)."""
from __future__ import annotations

from typing import Any

from apps.patients.export import serialize_instance

from .models import ActionItem, DoseLog, DrugIneligibility, HealthMetric, Prescription, Treatment, Visit


def export_clinical(patient: Any) -> dict[str, Any]:
    """Treatments, visits, prescriptions, doses, metrics and action items for one patient."""
    treatments = list(Treatment.objects.filter(patient=patient))
    ids = [t.pk for t in treatments]
    rows = lambda qs: [serialize_instance(o) for o in qs]  # noqa: E731
    return {
        "treatments": rows(treatments),
        "visits": rows(Visit.objects.filter(treatment_id__in=ids)),
        "prescriptions": rows(Prescription.objects.filter(treatment_id__in=ids)),
        "dose_logs": rows(DoseLog.objects.filter(treatment_id__in=ids)),
        "health_metrics": rows(HealthMetric.objects.filter(patient=patient)),
        "action_items": rows(ActionItem.objects.filter(patient=patient)),
        "drug_ineligibilities": rows(DrugIneligibility.objects.filter(patient=patient)),
    }
