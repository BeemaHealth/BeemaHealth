"""DB fixtures and a driver that walks a real Submission through the services."""
from __future__ import annotations

from typing import Any
from unittest import mock

from apps.accounts.models import User
from apps.catalog.models import Plan, Product
from apps.patients.models import PatientProfile
from apps.questionnaires import services
from apps.questionnaires.loader import load_questionnaire_definitions
from apps.questionnaires.models import Questionnaire, Submission, SubmissionFile

from .flow import BASE, TODAY, everywhere

PLAN_SLUGS = [
    "semaglutide-monthly", "semaglutide-3month", "semaglutide-6month", "semaglutide-12month",
    "tirzepatide-monthly", "tirzepatide-3month", "tirzepatide-6month", "tirzepatide-12month", "tirzepatide-starter-pack",
]


def make_patient(email: str = "pat@example.com") -> PatientProfile:
    user = User.objects.create_user(email, "S0me-long-passw0rd!", first_name="Pat", last_name="Tester")
    return PatientProfile.objects.create(user=user)


def make_plans() -> dict[str, Plan]:
    product = Product.objects.create(slug="weight-loss-glp1", name="Weight loss", category="weight_loss", neutral_label="Membership")
    return {
        slug: Plan.objects.create(
            product=product, slug=slug, name=slug, billing_commitment="prepaid_term",
            bill_interval_months=1, ship_interval_months=1, supply_days_per_shipment=30,
        )
        for slug in PLAN_SLUGS
    }


def publish_weight_loss():
    """Load the shipped layout and weight loss definition (published)."""
    load_questionnaire_definitions()
    return Questionnaire.objects.get(slug="weight_loss").latest_published()


def patched_storage():
    """Pretend every presigned upload landed in S3."""
    return mock.patch.multiple(
        "apps.questionnaires.storage",
        object_size=mock.Mock(return_value=2048),
        presign_upload=mock.Mock(return_value={"url": "https://s3.example/upload", "fields": {"key": "k"}}),
    )


def drive(
    sub: Submission,
    token: str | None,
    patient: PatientProfile,
    overrides: dict[str, Any] | None = None,
    *,
    stop_at: str | None = None,
    pay: bool = True,
    availability=everywhere,
) -> Submission:
    """Answer the flow with BASE answers (plus overrides) until it ends or reaches ``stop_at``."""
    answers = {**BASE, **(overrides or {})}
    with patched_storage():
        return _drive(sub, token, patient, answers, stop_at, pay, availability)


def _drive(sub, token, patient, answers, stop_at, pay, availability) -> Submission:
    for _ in range(100):
        sub.refresh_from_db()
        node = sub.version.definition["nodes"][sub.current_node]
        if sub.status != Submission.Status.IN_PROGRESS or node["id"] == stop_at:
            return sub
        kind = node["type"]
        if kind == "auth":
            services.claim(sub, patient, token)
            continue
        value = answers[node["id"]]
        if kind in ("file_input", "id_photo") and not value.get("skipped"):
            file = SubmissionFile.objects.create(
                submission=sub, kind=services._file_kind(node), s3_key=f"submissions/{sub.id}/{node['id']}"
            )
            value = {"file_ids": [str(file.id)]}
        services.answer(sub, node["id"], value, availability=availability, today=TODAY)
        if kind == "checkout" and pay:
            sub.refresh_from_db()
            services.complete_checkout(sub, availability=availability)
    raise AssertionError("drive did not finish")
