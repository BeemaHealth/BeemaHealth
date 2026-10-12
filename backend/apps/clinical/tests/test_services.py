from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.test import TestCase
from django.utils import timezone

from apps.clinical import services
from apps.clinical.models import DoseLog, DrugIneligibility, Prescription, Treatment, Visit
from apps.clinical.services import InvalidTransition
from apps.questionnaires.models import Questionnaire, QuestionnaireVersion, Submission

from .helpers import (
    StubbedHooksMixin, make_phase, make_plan, make_product, make_profile, make_treatment, make_variant, make_visit,
)

S = Treatment.Status


class StartTreatmentTests(StubbedHooksMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.profile = make_profile()
        self.product = make_product("weight-loss-glp1")
        self.variant = make_variant(self.product, "2.50", slug="tirz-none-titration")
        self.plan = make_plan(self.product, self.variant)
        q = Questionnaire.objects.create(slug="weight_loss", title="WL", product_slug=self.product.slug)
        self.version = QuestionnaireVersion.objects.create(questionnaire=q, version_label="v1")

    def submission(self, **extra) -> Submission:
        defaults = dict(patient=self.profile, version=self.version, selected_plan=self.plan, outcome={"eligible": True})
        defaults.update(extra)
        return Submission.objects.create(**defaults)

    def test_eligible_submission_awaits_payment(self):
        t = services.start_treatment_from_submission(self.submission())
        self.assertEqual(t.status, S.AWAITING_PAYMENT)
        self.assertEqual((t.product, t.plan, t.variant), (self.product, self.plan, self.variant))
        self.assertEqual(t.requested_strength_mg, Decimal("2.50"))
        self.assertEqual(t.requested_dose_label, "2.5 mg")

    def test_variant_resolved_from_outcome_key(self):
        other = make_variant(self.product, "5.00", slug="tirz-b12-maint", drug="tirzepatide", additive="b12", phase="maintenance")
        sub = self.submission(outcome={"eligible": True, "selected_variant_key": "tirz-b12-maint"})
        self.assertEqual(services.start_treatment_from_submission(sub).variant, other)

    def test_variant_resolved_from_composite_key(self):
        other = make_variant(self.product, "7.50", slug="v-composite", drug="tirzepatide", additive="glycine", phase="maintenance")
        sub = self.submission(outcome={"eligible": True, "selected_variant_key": "tirzepatide:glycine:maintenance"})
        self.assertEqual(services.start_treatment_from_submission(sub).variant, other)

    def test_disqualified_submission_is_not_eligible(self):
        sub = self.submission(status="disqualified", outcome={"eligible": False, "disqualified": True})
        t = services.start_treatment_from_submission(sub)
        self.assertEqual(t.status, S.NOT_ELIGIBLE)
        self.assertEqual(t.end_reason, "disqualified")

    def test_disqualified_without_plan_uses_questionnaire_product(self):
        sub = self.submission(status="disqualified", selected_plan=None, outcome={"disqualified": True})
        self.assertEqual(services.start_treatment_from_submission(sub).product, self.product)

    def test_undecided_submission_stays_in_progress(self):
        t = services.start_treatment_from_submission(self.submission(outcome={}))
        self.assertEqual(t.status, S.QUESTIONNAIRE_IN_PROGRESS)

    def test_idempotent(self):
        sub = self.submission()
        self.assertEqual(services.start_treatment_from_submission(sub).pk, services.start_treatment_from_submission(sub).pk)
        self.assertEqual(Treatment.objects.count(), 1)

    def test_requires_patient(self):
        with self.assertRaises(ValueError):
            services.start_treatment_from_submission(self.submission(patient=None))


class SubmittedToNetworkTests(StubbedHooksMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.profile = make_profile()

    def test_sets_timestamps_and_moves_to_pending_visit(self):
        t = make_treatment(self.profile, S.AWAITING_VISIT_COMPLETION)
        v = make_visit(t)
        services.mark_submitted_to_network(t, v)
        t.refresh_from_db()
        v.refresh_from_db()
        self.assertEqual(t.status, S.PENDING_VISIT)
        self.assertIsNotNone(t.submitted_to_network_at)
        self.assertIsNotNone(v.submitted_at)
        self.assertFalse(services.can_cancel(t))

    def test_from_routing_review(self):
        t = make_treatment(self.profile, S.ROUTING_REVIEW)
        services.mark_submitted_to_network(t, make_visit(t))
        t.refresh_from_db()
        self.assertEqual(t.status, S.PENDING_VISIT)

    def test_idempotent_for_same_visit(self):
        t = make_treatment(self.profile, S.AWAITING_VISIT_COMPLETION)
        v = make_visit(t)
        services.mark_submitted_to_network(t, v)
        first = t.submitted_to_network_at
        services.mark_submitted_to_network(t, v)
        self.assertEqual(t.submitted_to_network_at, first)

    def test_rejects_other_treatments_visit(self):
        t = make_treatment(self.profile)
        other = make_visit(make_treatment(self.profile))
        with self.assertRaises(ValueError):
            services.mark_submitted_to_network(t, other)

    def test_invalid_from_terminal_state(self):
        t = make_treatment(self.profile, S.CANCELED)
        with self.assertRaises(InvalidTransition):
            services.mark_submitted_to_network(t, make_visit(t))

    def test_refill_due_titration_visit_goes_pending(self):
        t = make_treatment(self.profile, S.REFILL_DUE)
        services.mark_submitted_to_network(t, make_visit(t, kind=Visit.Kind.TITRATION))
        t.refresh_from_db()
        self.assertEqual(t.status, S.PENDING_VISIT)


class VisitOutcomeTests(StubbedHooksMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.profile = make_profile()
        self.product = make_product()
        self.variant = make_variant(self.product, drug="semaglutide")
        self.t = make_treatment(self.profile, S.PENDING_VISIT, product=self.product, variant=self.variant,
                                submitted_to_network_at=timezone.now())
        self.visit = make_visit(self.t)

    def test_referred_creates_ineligibility_refunds_and_notifies(self):
        services.apply_visit_outcome(self.visit, "referred")
        self.t.refresh_from_db()
        self.visit.refresh_from_db()
        self.assertEqual(self.t.status, S.REFERRED)
        self.assertEqual(self.visit.outcome, Visit.Outcome.REFERRED)
        self.assertEqual(self.visit.status, Visit.Status.CONCLUDED)
        inel = DrugIneligibility.objects.get()
        self.assertEqual((inel.patient, inel.product, inel.drug, inel.source_treatment), (self.profile, self.product, "semaglutide", self.t))
        self.assertTrue(inel.is_active)
        self.hooks["refund_not_prescribed"].assert_called_once_with(self.t)
        self.hooks["notify_patient"].assert_called_once()

    def test_doctor_cancel_is_also_not_prescribed(self):
        services.apply_visit_outcome(self.visit, "canceled")
        self.t.refresh_from_db()
        self.assertEqual(self.t.status, S.CANCELED)
        self.assertEqual(DrugIneligibility.objects.count(), 1)
        self.hooks["refund_not_prescribed"].assert_called_once()
        self.visit.refresh_from_db()
        self.assertEqual(self.visit.status, Visit.Status.CANCELED)

    def test_referred_replay_is_noop(self):
        services.apply_visit_outcome(self.visit, "referred")
        services.apply_visit_outcome(self.visit, "referred")
        self.assertEqual(DrugIneligibility.objects.count(), 1)
        self.hooks["refund_not_prescribed"].assert_called_once()

    def test_referred_from_needs_patient_action(self):
        self.t.status = S.NEEDS_PATIENT_ACTION
        self.t.save()
        services.apply_visit_outcome(self.visit, "referred")
        self.t.refresh_from_db()
        self.assertEqual(self.t.status, S.REFERRED)

    def test_referred_after_prescribed_is_invalid(self):
        self.t.status = S.PRESCRIBED
        self.t.save()
        with self.assertRaises(InvalidTransition):
            services.apply_visit_outcome(self.visit, "referred")
        self.assertEqual(DrugIneligibility.objects.count(), 0)
        self.hooks["refund_not_prescribed"].assert_not_called()

    def test_refund_failure_rolls_everything_back(self):
        self.hooks["refund_not_prescribed"].side_effect = RuntimeError("boom")
        with self.assertRaises(RuntimeError):
            services.apply_visit_outcome(self.visit, "referred")
        self.t.refresh_from_db()
        self.assertEqual(self.t.status, S.PENDING_VISIT)
        self.assertEqual(DrugIneligibility.objects.count(), 0)

    def test_prescribed_moves_treatment_without_refund(self):
        services.apply_visit_outcome(self.visit, "prescribed")
        self.t.refresh_from_db()
        self.assertEqual(self.t.status, S.PRESCRIBED)
        self.hooks["refund_not_prescribed"].assert_not_called()
        self.assertEqual(DrugIneligibility.objects.count(), 0)

    def test_prescribed_after_rx_written_is_noop(self):
        services.apply_prescription(self.visit, {"external_rx_id": "rx1", "strength": "5mg"})
        services.apply_visit_outcome(self.visit, "prescribed")
        self.t.refresh_from_db()
        self.assertEqual(self.t.status, S.PRESCRIBED)

    def test_unknown_outcome_rejected(self):
        with self.assertRaises(ValueError):
            services.apply_visit_outcome(self.visit, "approved")

    def test_ineligibility_uses_product_slug_without_variant(self):
        self.t.variant = None
        self.t.save()
        services.apply_visit_outcome(self.visit, "referred")
        self.assertEqual(DrugIneligibility.objects.get().drug, self.product.slug)


class PrescriptionTests(StubbedHooksMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.profile = make_profile()
        self.product = make_product()
        self.variant = make_variant(self.product, "5.00")
        self.plan = make_plan(self.product, self.variant)
        self.t = make_treatment(
            self.profile, S.PENDING_VISIT, product=self.product, variant=self.variant, plan=self.plan,
            requested_strength_mg=Decimal("5.00"), submitted_to_network_at=timezone.now(),
        )
        self.visit = make_visit(self.t, doctor_name="Dr. Example")

    def rx(self, **extra):
        data = {"external_rx_id": "rx-1", "external_med_id": "med-1", "drug": "tirzepatide", "strength": "5 mg", "quantity": 4, "refills": 2}
        data.update(extra)
        return data

    def test_same_dose_is_not_flagged(self):
        rx = services.apply_prescription(self.visit, self.rx())
        self.t.refresh_from_db()
        self.assertEqual(self.t.status, S.PRESCRIBED)
        self.assertEqual(self.t.prescribed_strength_mg, Decimal("5"))
        self.assertFalse(self.t.dose_changed_by_doctor)
        self.assertEqual((rx.prescriber_name, rx.refills, rx.quantity), ("Dr. Example", 2, 4))
        self.assertIsNone(rx.prescriber_npi)

    def test_doctor_dose_change_is_flagged_and_patient_notified(self):
        services.apply_prescription(self.visit, self.rx(strength="2.5 mg"))
        self.t.refresh_from_db()
        self.assertTrue(self.t.dose_changed_by_doctor)
        self.assertEqual(self.t.prescribed_strength_mg, Decimal("2.5"))
        self.hooks["notify_patient"].assert_called_once_with(self.t.patient, "rx_written")

    def test_explicit_strength_mg_wins(self):
        services.apply_prescription(self.visit, self.rx(strength="see label", strength_mg="7.5"))
        self.t.refresh_from_db()
        self.assertEqual(self.t.prescribed_strength_mg, Decimal("7.5"))
        self.assertTrue(self.t.dose_changed_by_doctor)

    def test_unparseable_strength_leaves_dose_untouched(self):
        services.apply_prescription(self.visit, self.rx(strength="one pen"))
        self.t.refresh_from_db()
        self.assertIsNone(self.t.prescribed_strength_mg)
        self.assertFalse(self.t.dose_changed_by_doctor)

    def test_no_requested_strength_never_flags(self):
        self.t.requested_strength_mg = None
        self.t.save()
        services.apply_prescription(self.visit, self.rx())
        self.t.refresh_from_db()
        self.assertFalse(self.t.dose_changed_by_doctor)

    def test_idempotent_by_external_rx_id(self):
        first = services.apply_prescription(self.visit, self.rx())
        second = services.apply_prescription(self.visit, self.rx())
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(Prescription.objects.count(), 1)
        self.hooks["notify_patient"].assert_called_once()

    def test_additional_rx_after_prescribed_keeps_state(self):
        services.apply_prescription(self.visit, self.rx())
        services.apply_prescription(self.visit, self.rx(external_rx_id="rx-2"))
        self.assertEqual(Prescription.objects.count(), 2)

    def test_rejected_in_terminal_state(self):
        for state in (S.CANCELED, S.REFERRED, S.ENDED, S.ROUTING_REVIEW):
            with self.subTest(state=state):
                t = make_treatment(self.profile, state)
                with self.assertRaises(InvalidTransition):
                    services.apply_prescription(make_visit(t), self.rx(external_rx_id=f"rx-{state}"))

    def test_generates_weekly_schedule(self):
        services.apply_prescription(self.visit, self.rx())
        self.assertEqual(DoseLog.objects.filter(treatment=self.t, status=DoseLog.Status.SCHEDULED).count(), 4)


class DoseScheduleTests(StubbedHooksMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.profile = make_profile()
        self.product = make_product()
        self.variant = make_variant(self.product, "2.50")
        self.start = timezone.now() + timedelta(days=1)

    def treatment(self, plan=None, **extra):
        return make_treatment(
            self.profile, S.PRESCRIBED, product=self.product, variant=self.variant, plan=plan,
            requested_strength_mg=Decimal("2.50"), **extra,
        )

    def test_weekly_dosing_for_one_shipment(self):
        plan = make_plan(self.product, self.variant, supply_days=28)
        t = self.treatment(plan)
        logs = services.generate_dose_schedule(t, start_on=self.start)
        self.assertEqual(len(logs), 4)
        self.assertEqual([l.dose_number for l in logs], [1, 2, 3, 4])
        gaps = {(b.scheduled_at - a.scheduled_at).days for a, b in zip(logs, logs[1:])}
        self.assertEqual(gaps, {7})
        self.assertTrue(all(l.strength_mg == Decimal("2.50") and l.auto_generated for l in logs))
        self.assertTrue(all(l.status == DoseLog.Status.SCHEDULED and l.entered_by == "patient" for l in logs))

    def test_prescribed_strength_preferred(self):
        t = self.treatment(make_plan(self.product, self.variant), prescribed_strength_mg=Decimal("5.00"))
        logs = services.generate_dose_schedule(t, start_on=self.start)
        self.assertEqual({l.strength_mg for l in logs}, {Decimal("5.00")})

    def test_starter_pack_phases_step_up_monthly(self):
        v5 = make_variant(self.product, "5.00")
        v75 = make_variant(self.product, "7.50")
        plan = make_plan(self.product, term=3, kind="starter_pack")
        make_phase(plan, 1, 0, self.variant)
        make_phase(plan, 2, 1, v5)
        make_phase(plan, 3, 2, v75)
        t = self.treatment(plan)
        logs = services.generate_dose_schedule(t, start_on=self.start)
        by_month = {}
        for log in logs:
            by_month.setdefault((log.scheduled_at - self.start).days // 30, set()).add(log.strength_mg)
        self.assertEqual(by_month, {0: {Decimal("2.50")}, 1: {Decimal("5.00")}, 2: {Decimal("7.50")}})
        self.assertGreaterEqual(len(logs), 12)

    def test_custom_interval_and_horizon(self):
        plan = make_plan(self.product, self.variant)
        make_phase(plan, 1, 0, self.variant, interval=14)
        t = self.treatment(plan)
        logs = services.generate_dose_schedule(t, start_on=self.start, horizon_days=60)
        self.assertEqual(len(logs), 5)

    def test_without_plan_defaults_to_four_weekly_doses(self):
        logs = services.generate_dose_schedule(self.treatment(None), start_on=self.start)
        self.assertEqual(len(logs), 4)

    def test_regeneration_replaces_untouched_future_doses_only(self):
        plan = make_plan(self.product, self.variant)
        t = self.treatment(plan)
        first = services.generate_dose_schedule(t, start_on=self.start)
        taken = first[0]
        taken.status = DoseLog.Status.TAKEN
        taken.taken_at = timezone.now()
        taken.save()
        manual = DoseLog.objects.create(treatment=t, scheduled_at=self.start, status=DoseLog.Status.SCHEDULED)
        again = services.generate_dose_schedule(t, start_on=self.start + timedelta(days=28))
        self.assertTrue(DoseLog.objects.filter(pk=taken.pk).exists())
        self.assertTrue(DoseLog.objects.filter(pk=manual.pk).exists())
        self.assertFalse(DoseLog.objects.filter(pk=first[1].pk).exists())
        self.assertEqual(again[0].dose_number, 2)
        self.assertEqual(DoseLog.objects.filter(treatment=t, auto_generated=True).count(), 1 + 4)
