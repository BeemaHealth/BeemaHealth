import hashlib
import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from apps.accounts.models import EmailVerificationToken, User

logger = logging.getLogger(__name__)

TOKEN_TTL_HOURS = 48


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_email_verification_token(user: User) -> str:
    EmailVerificationToken.objects.filter(user=user, used_at__isnull=True).delete()
    token = secrets.token_urlsafe(32)
    EmailVerificationToken.objects.create(
        user=user,
        token_hash=hash_token(token),
        expires_at=timezone.now() + timedelta(hours=TOKEN_TTL_HOURS),
    )
    return token


def send_verification_email(user: User, token: str) -> None:
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:8080").rstrip("/")
    verify_url = f"{frontend_url}/verify-email?token={token}"
    subject = "Verify your Aretide email"
    message = (
        f"Hi,\n\n"
        f"Please verify your email address to continue your medical intake:\n\n"
        f"{verify_url}\n\n"
        f"This link expires in {TOKEN_TTL_HOURS} hours.\n\n"
        f"If you did not create an account, you can ignore this email.\n"
    )
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )
    logger.info("Email verification link for %s: %s", user.email, verify_url)


def verify_email_token(token: str) -> User:
    try:
        record = EmailVerificationToken.objects.select_related("user").get(
            token_hash=hash_token(token),
            used_at__isnull=True,
            expires_at__gt=timezone.now(),
        )
    except EmailVerificationToken.DoesNotExist as exc:
        raise ValueError("Invalid or expired verification link.") from exc

    user = record.user
    user.email_verified = True
    user.save(update_fields=["email_verified", "updated_at"])
    record.used_at = timezone.now()
    record.save(update_fields=["used_at"])
    return user
