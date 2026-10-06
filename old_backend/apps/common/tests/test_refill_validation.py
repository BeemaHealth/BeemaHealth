from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import User
from apps.common.validation.refill import (
    REFILL_REQUEST_COOLDOWN_HOURS,
    get_refill_cooldown,
    validate_refill_request_allowed,
)
from apps.intakes.models import RefillRequest


class RefillCooldownValidationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="patient@example.com",
            password="secure-pass-1",
            first_name="Jane",
            last_name="Doe",
            phone="3035550100",
        )

    def test_first_refill_has_no_cooldown(self):
        self.assertIsNone(validate_refill_request_allowed(None))
        status = get_refill_cooldown(None)
        self.assertFalse(status.active)
        self.assertIsNone(status.retry_after)
        self.assertIsNone(status.hours_remaining)

    def test_recent_refill_blocks_within_cooldown(self):
        refill = RefillRequest.objects.create(user=self.user)
        error = validate_refill_request_allowed(refill)
        self.assertIsNotNone(error)
        self.assertIn("24 hours", error)
        self.assertIn("contact support", error)

        status = get_refill_cooldown(refill)
        self.assertTrue(status.active)
        self.assertIsNotNone(status.retry_after)
        self.assertGreater(status.hours_remaining or 0, 0)

    def test_refill_allowed_after_cooldown(self):
        refill = RefillRequest.objects.create(user=self.user)
        RefillRequest.objects.filter(pk=refill.pk).update(
            created_at=timezone.now()
            - timedelta(hours=REFILL_REQUEST_COOLDOWN_HOURS, minutes=1)
        )
        refill.refresh_from_db()

        self.assertIsNone(validate_refill_request_allowed(refill))
        status = get_refill_cooldown(refill)
        self.assertFalse(status.active)
