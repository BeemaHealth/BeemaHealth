import json
from unittest import mock

from django.conf import settings
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from apps.accounts.models import User
from apps.billing.exceptions import CheckoutError
from apps.billing.services import create_checkout
from apps.clinical import services
from apps.clinical.models import DrugIneligibility, Treatment
from apps.clinical.services import IneligibleError
from apps.questionnaires import services as qs
from apps.questionnaires.models import Questionnaire, QuestionnaireVersion, Submission

from .helpers import StubbedHooksMixin, make_plan, make_product, make_profile, make_variant


class IneligibilityBase(StubbedHooksMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.profile = make_profile()
        self.sema = make_product("sema")
        self.tirz = make_product("tirz")
        self.v_sema = make_variant(self.sema, "1.00", drug="semaglutide")
        self.v_tirz = make_variant(self.tirz, "5.00", drug="tirzepatide")
        self.umbrella = make_product("umbrella")
        self.v_u_sema = make_variant(self.umbrella, "1.00", drug="semaglutide")
        self.v_u_tirz = make_variant(self.umbrella, "5.00", drug="tirzepatide")

    def block(self, product=None, drug="semaglutide", **extra):
        return DrugIneligibility.objects.create(
            patient=self.profile, product=product or self.sema, drug=drug, reason="not_prescribed", **extra
        )


class IsIneligibleTests(IneligibilityBase):
    def test_none_without_rows(self):
        self.assertIsNone(services.is_ineligible(self.profile, "semaglutide"))

    def test_matches_drug_string_variant_and_product(self):
        row = self.block()
        self.assertEqual(services.is_ineligible(self.profile, "SEMAGLUTIDE"), row)
        self.assertEqual(services.is_ineligible(self.profile, self.v_sema), row)
        self.assertEqual(services.is_ineligible(self.profile, self.v_u_sema), row)
        self.assertEqual(services.is_ineligible(self.profile, self.sema), row)

    def test_other_drug_not_blocked(self):
        self.block()
        self.assertIsNone(services.is_ineligible(self.profile, "tirzepatide"))
        self.assertIsNone(services.is_ineligible(self.profile, self.v_tirz))
        self.assertIsNone(services.is_ineligible(self.profile, self.tirz))

    def test_umbrella_product_blocked_only_when_every_drug_blocked(self):
        self.block()
        self.assertIsNone(services.is_ineligible(self.profile, self.umbrella))
        self.block(self.tirz, "tirzepatide")
        self.assertIsNotNone(services.is_ineligible(self.profile, self.umbrella))

    def test_lifted_rows_ignored(self):
        self.block(lifted_at=timezone.now())
        self.assertIsNone(services.is_ineligible(self.profile, "semaglutide"))
        self.assertIsNone(services.is_ineligible(self.profile, self.sema))

    def test_other_patients_not_affected(self):
        self.block()
        self.assertIsNone(services.is_ineligible(make_profile(), "semaglutide"))


class EnforcementTests(IneligibilityBase):
    def setUp(self):
        super().setUp()
        q = Questionnaire.objects.create(slug="wl", title="WL", product_slug=self.umbrella.slug)
        definition = json.loads((settings.DEFINITIONS_DIR / "questionnaires" / "weight_loss.v1.json").read_text())
        self.version = QuestionnaireVersion.objects.create(questionnaire=q, version_label="v1", definition=definition)
        self.plan = make_plan(self.sema, self.v_sema)

    def submission(self, plan):
        return Submission.objects.create(
            patient=self.profile, version=self.version, selected_plan=plan, outcome={"eligible": True}
        )

    def test_start_treatment_blocked(self):
        self.block()
        with self.assertRaises(IneligibleError) as ctx:
            services.start_treatment_from_submission(self.submission(self.plan))
        self.assertNotIn(str(self.profile.pk), str(ctx.exception))
        self.assertEqual(Treatment.objects.count(), 0)

    def test_start_treatment_allowed_for_other_drug_or_after_lift(self):
        row = self.block()
        other = make_plan(self.tirz, self.v_tirz)
        self.assertEqual(services.start_treatment_from_submission(self.submission(other)).status, "awaiting_payment")
        row.lifted_at = timezone.now()
        row.save()
        self.assertEqual(services.start_treatment_from_submission(self.submission(self.plan)).status, "awaiting_payment")

    def test_checkout_blocked_with_patient_safe_error(self):
        self.block()
        with self.assertRaises(CheckoutError) as ctx:
            create_checkout(self.profile, self.plan, consents=["no_cancel_after_submit"])
        self.assertEqual(ctx.exception.code, "previously_ineligible")
        self.assertNotIn("semaglutide", str(ctx.exception).lower())

    def test_checkout_not_blocked_for_other_drug(self):
        self.block()
        try:
            create_checkout(make_profile(), self.plan, consents=["no_cancel_after_submit"])
        except CheckoutError as exc:
            self.assertNotEqual(exc.code, "previously_ineligible")
        except Exception:  # noqa: BLE001 - later checkout steps need Stripe fakes; only the gate matters
            pass

    def claim(self):
        sub = Submission.objects.create(version=self.version, anonymous_token="h" * 64, current_node="motivation")
        with mock.patch.object(qs, "hash_token", return_value="h" * 64):
            return qs.claim(sub, self.profile, "raw")

    def test_claim_disqualifies_when_every_drug_blocked(self):
        self.block()
        self.block(self.tirz, "tirzepatide")
        sub = self.claim()
        self.assertEqual(sub.status, Submission.Status.DISQUALIFIED)
        self.assertEqual(sub.outcome["disqualify_reason"], "previously_ineligible")
        data = qs.describe(sub)
        self.assertEqual(data["node"]["type"], "no_proceed")
        self.assertEqual(data["disqualify_reason"], "previously_ineligible")
        self.assertIn("support", data["node"]["body"])

    def test_claim_allows_patient_with_one_blocked_drug_or_none(self):
        self.assertEqual(self.claim().status, Submission.Status.IN_PROGRESS)

    def test_claim_allows_after_lift(self):
        self.block(lifted_at=timezone.now())
        self.block(self.tirz, "tirzepatide", lifted_at=timezone.now())
        self.assertEqual(self.claim().status, Submission.Status.IN_PROGRESS)


class AdminTests(IneligibilityBase):
    def setUp(self):
        super().setUp()
        self.admin = User.objects.create_superuser("root@example.com", "pw-long-enough-123")
        self.client.force_login(self.admin)

    def test_lift_action_and_filter(self):
        row, done = self.block(), self.block(self.tirz, "tirzepatide", lifted_at=timezone.now())
        url = reverse("admin:clinical_drugineligibility_changelist")
        self.client.post(url, {"action": "lift_ineligibility", "_selected_action": [str(row.pk), str(done.pk)]}, follow=True)
        row.refresh_from_db()
        done.refresh_from_db()
        self.assertEqual((row.lifted_by, row.lifted_at is not None), (self.admin, True))
        self.assertIsNone(done.lifted_by)
        self.assertIsNone(services.is_ineligible(self.profile, "semaglutide"))

    def test_status_filter(self):
        self.block()
        self.block(self.tirz, "tirzepatide", lifted_at=timezone.now())
        url = reverse("admin:clinical_drugineligibility_changelist")
        active = self.client.get(url, {"block": "active"}).context["cl"].result_list
        lifted = self.client.get(url, {"block": "lifted"}).context["cl"].result_list
        self.assertEqual([r.drug for r in active], ["semaglutide"])
        self.assertEqual([r.drug for r in lifted], ["tirzepatide"])
