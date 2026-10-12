from itertools import product as cartesian

from django.test import TestCase
from django.utils import timezone

from apps.clinical import services
from apps.clinical.models import ActionItem, Treatment
from apps.clinical.services import ALLOWED_TRANSITIONS, InvalidTransition

from .helpers import StubbedHooksMixin, make_profile, make_treatment

S = Treatment.Status
ALL = [s.value for s in S]


class TransitionMatrixTests(StubbedHooksMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.profile = make_profile()

    def test_every_state_has_a_transition_entry(self):
        self.assertEqual(set(ALLOWED_TRANSITIONS), set(ALL))

    def test_every_allowed_transition_succeeds(self):
        for old, new in cartesian(ALL, ALL):
            if new not in ALLOWED_TRANSITIONS[old]:
                continue
            with self.subTest(old=old, new=new):
                t = make_treatment(self.profile, old)
                services.transition(t, new)
                t.refresh_from_db()
                self.assertEqual(t.status, new)

    def test_every_other_transition_is_rejected(self):
        for old, new in cartesian(ALL, ALL):
            if new in ALLOWED_TRANSITIONS[old]:
                continue
            with self.subTest(old=old, new=new):
                t = make_treatment(self.profile, old)
                with self.assertRaises(InvalidTransition):
                    services.transition(t, new)
                t.refresh_from_db()
                self.assertEqual(t.status, old)

    def test_self_transition_is_rejected(self):
        for state in ALL:
            self.assertFalse(services.can_transition(state, state))

    def test_terminal_states_have_no_exits(self):
        for state in (S.NOT_ELIGIBLE, S.CANCELED, S.REFERRED, S.ENDED):
            self.assertEqual(ALLOWED_TRANSITIONS[state], frozenset())

    def test_unknown_status_is_rejected(self):
        t = make_treatment(self.profile, S.ACTIVE)
        with self.assertRaises(InvalidTransition):
            services.transition(t, "bogus")

    def test_invalid_transition_is_an_invalid_state_transition(self):
        from apps.common.exceptions import InvalidStateTransition

        self.assertTrue(issubclass(InvalidTransition, InvalidStateTransition))

    def test_terminal_transition_sets_end_fields(self):
        t = make_treatment(self.profile, S.ACTIVE)
        services.transition(t, S.ENDED, reason="doctor_stopped")
        t.refresh_from_db()
        self.assertIsNotNone(t.ended_at)
        self.assertEqual(t.end_reason, "doctor_stopped")

    def test_entering_active_sets_started_at_once(self):
        t = make_treatment(self.profile, S.PRESCRIBED)
        services.transition(t, S.ACTIVE)
        first = t.started_at
        self.assertIsNotNone(first)
        services.transition(t, S.PAUSED)
        services.transition(t, S.ACTIVE)
        self.assertEqual(t.started_at, first)

    def test_transition_records_care_event_without_free_text(self):
        t = make_treatment(self.profile, S.ACTIVE)
        services.transition(t, S.PAUSED, reason="patient_request")
        kwargs = self.hooks["record_event"].call_args.kwargs
        self.assertEqual(kwargs["event"], "treatment.paused")
        self.assertEqual(kwargs["source"], "system")
        self.assertEqual(kwargs["payload"], {"from": "active", "to": "paused", "reason": "patient_request"})

    def test_actor_marks_event_as_staff(self):
        t = make_treatment(self.profile, S.ACTIVE)
        services.transition(t, S.PAUSED, actor=object())
        self.assertEqual(self.hooks["record_event"].call_args.kwargs["source"], "staff")

    def test_no_event_for_rejected_transition(self):
        t = make_treatment(self.profile, S.ENDED)
        with self.assertRaises(InvalidTransition):
            services.transition(t, S.ACTIVE)
        self.hooks["record_event"].assert_not_called()


class ActionItemTests(StubbedHooksMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.profile = make_profile()

    def test_awaiting_visit_completion_opens_item(self):
        t = make_treatment(self.profile, S.AWAITING_PAYMENT)
        services.mark_payment_received(t)
        item = ActionItem.objects.get(treatment=t)
        self.assertEqual(item.kind, ActionItem.Kind.COMPLETE_VISIT)
        self.assertTrue(item.is_open)
        self.assertEqual(item.patient, self.profile)

    def test_leaving_state_resolves_item(self):
        t = make_treatment(self.profile, S.AWAITING_PAYMENT)
        services.mark_payment_received(t)
        services.transition(t, S.PENDING_VISIT)
        item = ActionItem.objects.get(treatment=t)
        self.assertFalse(item.is_open)
        self.assertIsNotNone(item.resolved_at)

    def test_needs_patient_action_uses_requested_kind(self):
        t = make_treatment(self.profile, S.PENDING_VISIT)
        services.transition(t, S.NEEDS_PATIENT_ACTION, action_kind=ActionItem.Kind.UPLOAD_ID)
        self.assertEqual(ActionItem.objects.get(treatment=t, is_open=True).kind, ActionItem.Kind.UPLOAD_ID)

    def test_needs_patient_action_default_kind_and_resolution(self):
        t = make_treatment(self.profile, S.PENDING_VISIT)
        services.transition(t, S.NEEDS_PATIENT_ACTION)
        self.assertEqual(ActionItem.objects.get(treatment=t, is_open=True).kind, ActionItem.Kind.ANSWER_FOLLOWUP)
        services.transition(t, S.PENDING_VISIT)
        self.assertFalse(ActionItem.objects.filter(treatment=t, is_open=True).exists())

    def test_no_duplicate_open_item(self):
        t = make_treatment(self.profile, S.PENDING_VISIT)
        ActionItem.objects.create(
            treatment=t, patient=self.profile, kind=ActionItem.Kind.ANSWER_FOLLOWUP, title="x", opened_by_state="needs_patient_action"
        )
        services.transition(t, S.NEEDS_PATIENT_ACTION)
        self.assertEqual(ActionItem.objects.filter(treatment=t, is_open=True).count(), 1)

    def test_unrelated_items_stay_open(self):
        t = make_treatment(self.profile, S.AWAITING_VISIT_COMPLETION)
        other = ActionItem.objects.create(treatment=t, patient=self.profile, kind=ActionItem.Kind.PAYMENT_FAILED, title="Pay")
        services.transition(t, S.PENDING_VISIT)
        other.refresh_from_db()
        self.assertTrue(other.is_open)


class CanCancelTests(StubbedHooksMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.profile = make_profile()

    def test_cancelable_before_submission_in_pre_network_states(self):
        for state in (S.QUESTIONNAIRE_IN_PROGRESS, S.AWAITING_PAYMENT, S.AWAITING_VISIT_COMPLETION, S.ROUTING_REVIEW):
            with self.subTest(state=state):
                self.assertTrue(services.can_cancel(make_treatment(self.profile, state)))

    def test_not_cancelable_once_submitted_in_any_state(self):
        for state in ALL:
            with self.subTest(state=state):
                t = make_treatment(self.profile, state, submitted_to_network_at=timezone.now())
                self.assertFalse(services.can_cancel(t))

    def test_not_cancelable_in_terminal_or_post_visit_states(self):
        for state in (S.CANCELED, S.REFERRED, S.NOT_ELIGIBLE, S.ENDED, S.ACTIVE, S.PRESCRIBED, S.PAUSED):
            with self.subTest(state=state):
                self.assertFalse(services.can_cancel(make_treatment(self.profile, state)))

    def test_cancel_paid_treatment_refunds(self):
        t = make_treatment(self.profile, S.AWAITING_VISIT_COMPLETION)
        services.cancel_treatment(t)
        t.refresh_from_db()
        self.assertEqual(t.status, S.CANCELED)
        self.hooks["refund_canceled_before_submission"].assert_called_once_with(t)

    def test_cancel_unpaid_treatment_does_not_refund(self):
        for state in (S.QUESTIONNAIRE_IN_PROGRESS, S.AWAITING_PAYMENT):
            t = make_treatment(self.profile, state)
            services.cancel_treatment(t)
        self.hooks["refund_canceled_before_submission"].assert_not_called()

    def test_cancel_after_submission_is_rejected_without_refund(self):
        t = make_treatment(self.profile, S.PENDING_VISIT, submitted_to_network_at=timezone.now())
        with self.assertRaises(InvalidTransition):
            services.cancel_treatment(t)
        t.refresh_from_db()
        self.assertEqual(t.status, S.PENDING_VISIT)
        self.hooks["refund_canceled_before_submission"].assert_not_called()

    def test_refund_failure_rolls_back_cancel(self):
        self.hooks["refund_canceled_before_submission"].side_effect = RuntimeError("stripe down")
        t = make_treatment(self.profile, S.AWAITING_VISIT_COMPLETION)
        with self.assertRaises(RuntimeError):
            services.cancel_treatment(t)
        t.refresh_from_db()
        self.assertEqual(t.status, S.AWAITING_VISIT_COMPLETION)
