"""Management command to send abandoned checkout drip emails on schedule."""
from datetime import datetime

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.messaging.models import AbandonedCheckout, NotificationDelivery
from apps.messaging.notifiers import get_notifier


class Command(BaseCommand):
    help = "Send abandoned checkout drip emails (1, 3, 24, 48, 72, 168, 336 hours)"

    def handle(self, *args, **options):
        now = timezone.now()
        stats = {"sent": 0, "errors": 0}

        # Find checkouts due for the next email
        checkouts = AbandonedCheckout.objects.filter(
            completed_at__isnull=True,
            stopped_at__isnull=True,
        )

        for checkout in checkouts:
            next_step = checkout.next_step_due(now)
            if not next_step:
                continue

            # Send the email
            success = self._send_step_email(checkout, next_step, now)
            if success:
                # Mark step as sent
                emails_sent = list(checkout.emails_sent) if checkout.emails_sent else []
                if next_step not in emails_sent:
                    emails_sent.append(next_step)
                    checkout.emails_sent = emails_sent
                    checkout.save(update_fields=["emails_sent"])
                stats["sent"] += 1
            else:
                stats["errors"] += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Sent {stats['sent']} abandoned checkout emails, "
                f"{stats['errors']} errors"
            )
        )

    def _send_step_email(self, checkout: AbandonedCheckout, step: int, now: datetime) -> bool:
        """Send one step of the abandoned checkout drip."""
        if not checkout.patient or not checkout.patient.user:
            return False

        patient = checkout.patient
        user = patient.user

        if not user.email:
            return False

        # Never email a patient who has an active subscription
        try:
            from apps.billing.models import Subscription
            if Subscription.objects.filter(patient=patient, status="active").exists():
                return False  # Not an error, just skip
        except Exception:
            pass  # If billing app not ready, proceed anyway

        # Get the notifier
        from django.conf import settings
        notifier = get_notifier(settings.EMAIL_NOTIFY_BACKEND)

        template_key = f"abandoned_checkout_{step}"
        context = {
            "portal_url": settings.PORTAL_BASE_URL,
            "first_name": user.first_name or "there",
        }

        success, msg_id = notifier.send(user.email, template_key, context)

        # Record the notification delivery
        NotificationDelivery.objects.create(
            patient=patient,
            channel="email",
            template_key=template_key,
            status="sent" if success else "failed",
            provider_message_id=msg_id if success else "",
            error=msg_id if not success else "",
            sent_at=now if success else None,
        )

        return success
