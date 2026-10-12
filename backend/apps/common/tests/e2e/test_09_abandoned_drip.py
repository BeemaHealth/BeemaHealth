"""Scenario 9: abandoned checkout drip over simulated time, stopping at purchase."""
from __future__ import annotations

from datetime import timedelta
from io import StringIO
from unittest import mock

from django.core.management import call_command
from django.utils import timezone

from apps.messaging.models import AbandonedCheckout, NotificationDelivery
from apps.messaging.notifiers import SesEmailNotifier, TwilioSmsNotifier

from .base import Actor, E2ECase, glue_buy

SCHEDULE_HOURS = [1, 3, 24, 48, 72, 168, 336]


class AbandonedDripTests(E2ECase):
    def reach_checkout(self, email: str = "drip@example.com"):
        actor = Actor(self, email)
        actor.start()
        self.assertEqual(actor.run()["node"]["id"], "checkout")
        drip = AbandonedCheckout.objects.get(submission=actor.submission())
        return actor, drip

    def run_drip(self, at):
        with mock.patch("django.utils.timezone.now", return_value=at):
            call_command("send_abandoned_checkout_emails", stdout=StringIO())

    def test_drip_sends_each_step_once_at_the_scheduled_hour_then_stops(self):
        actor, drip = self.reach_checkout()
        t0 = drip.started_at
        self.run_drip(t0 + timedelta(minutes=30))
        self.assertEqual(self.notifier.sent, [])
        for step, hours in enumerate(SCHEDULE_HOURS, 1):
            self.run_drip(t0 + timedelta(hours=hours) - timedelta(minutes=1))
            self.assertEqual(len(self.notifier.sent), step - 1, f"early send before hour {hours}")
            self.run_drip(t0 + timedelta(hours=hours, minutes=1))
            self.run_drip(t0 + timedelta(hours=hours, minutes=2))  # a second run is idempotent
            self.assertEqual(len(self.notifier.sent), step)
            self.assertEqual(self.notifier.sent[-1]["template_key"], f"abandoned_checkout_{step}")
            drip.refresh_from_db()
            self.assertEqual(drip.emails_sent, list(range(1, step + 1)))
        self.run_drip(t0 + timedelta(hours=1000))
        self.assertEqual(len(self.notifier.sent), 7)
        # Email only, to the patient, never to a phone.
        self.assertEqual({n["recipient"] for n in self.notifier.sent}, {"drip@example.com"})
        self.assertEqual(set(NotificationDelivery.objects.values_list("channel", flat=True)), {"email"})

    def test_late_run_catches_up_one_step_per_run(self):
        actor, drip = self.reach_checkout()
        far = drip.started_at + timedelta(hours=400)
        for expected in range(1, 8):
            self.run_drip(far)
            self.assertEqual(len(self.notifier.sent), expected)
        self.run_drip(far)
        self.assertEqual(len(self.notifier.sent), 7)

    def test_drip_stops_once_the_checkout_is_completed(self):
        actor, drip = self.reach_checkout()
        t0 = drip.started_at
        self.run_drip(t0 + timedelta(hours=4))
        self.run_drip(t0 + timedelta(hours=4))  # one step per run
        self.assertEqual(len(self.notifier.sent), 2)
        treatment, invoice = glue_buy(self, actor, "semaglutide-monthly")
        drip.refresh_from_db()
        drip.completed_at = drip.completed_at or timezone.now()  # what the purchase hook should do (see below)
        drip.save()
        self.run_drip(t0 + timedelta(hours=100))
        self.assertEqual(len(self.notifier.sent), 2)

    def test_purchase_stops_the_drip_without_manual_help(self):
        actor, drip = self.reach_checkout("buyer@example.com")
        glue_buy(self, actor, "semaglutide-monthly")
        drip.refresh_from_db()
        self.assertTrue(drip.completed_at or drip.stopped_at)
        self.run_drip(drip.started_at + timedelta(hours=100))
        self.assertEqual(self.notifier.sent, [])

    def test_reaching_checkout_starts_a_drip(self):
        actor = Actor(self, "auto@example.com")
        actor.start()
        actor.run()
        drip = AbandonedCheckout.objects.get(patient=actor.profile)
        self.assertEqual(drip.email, "auto@example.com")  # read from the User, not the profile
        self.assertEqual(drip.submission_id, actor.submission().pk)
        self.assertIsNotNone(drip.reached_checkout_at)
        actor.answer("checkout", {"plan_slug": "semaglutide-monthly"})
        self.assertEqual(AbandonedCheckout.objects.filter(patient=actor.profile).count(), 1)  # idempotent

    def test_every_drip_step_has_a_real_email_template(self):
        ses = SesEmailNotifier.__new__(SesEmailNotifier)
        sms = TwilioSmsNotifier.__new__(TwilioSmsNotifier)
        for step in range(1, 8):
            key = f"abandoned_checkout_{step}"
            subject, text, html = ses._build_message(key, {"portal_url": "https://portal.test"})
            self.assertTrue(subject and text and html, key)
            self.assertTrue(sms._build_message_body(key, {}), key)
        self.assertEqual(ses._build_message("abandoned_checkout_8", {}), ("", "", ""))
