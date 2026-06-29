import hashlib
import logging
import secrets
import threading
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from apps.accounts.models import EmailVerificationToken, LoginMfaChallenge, User

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
    logger.info(
        "Sent verification email to %s via %s (link: %s)",
        user.email,
        settings.EMAIL_BACKEND,
        verify_url,
    )


def _send_and_log_errors(user: User, token: str) -> None:
    try:
        send_verification_email(user, token)
    except Exception:
        logger.exception("Failed to send verification email to %s", user.email)


def queue_verification_email(user: User, token: str) -> None:
    """Send verification email without blocking the HTTP response (SMTP can be slow)."""
    threading.Thread(
        target=_send_and_log_errors,
        args=(user, token),
        daemon=True,
    ).start()


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


MFA_TTL_MINUTES = 10


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def create_login_mfa_challenge(user: User) -> tuple[LoginMfaChallenge, str]:
    LoginMfaChallenge.objects.filter(user=user, used_at__isnull=True).delete()
    code = f"{secrets.randbelow(1_000_000):06d}"
    challenge = LoginMfaChallenge.objects.create(
        user=user,
        code_hash=_hash_code(code),
        expires_at=timezone.now() + timedelta(minutes=MFA_TTL_MINUTES),
    )
    return challenge, code


def send_login_mfa_email(user: User, code: str) -> None:
    subject = "Your Aretide sign-in code"
    message = (
        f"Hi {user.first_name or 'there'},\n\n"
        f"Your sign-in verification code is: {code}\n\n"
        f"This code expires in {MFA_TTL_MINUTES} minutes.\n\n"
        f"If you did not try to sign in, contact support immediately.\n"
    )
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )


def _send_mfa_and_log_errors(user: User, code: str) -> None:
    try:
        send_login_mfa_email(user, code)
    except Exception:
        logger.exception("Failed to send MFA email to %s", user.email)


def queue_login_mfa_email(user: User, code: str) -> None:
    threading.Thread(
        target=_send_mfa_and_log_errors,
        args=(user, code),
        daemon=True,
    ).start()


def verify_login_mfa_challenge(challenge_id: str, code: str) -> User:
    try:
        challenge = LoginMfaChallenge.objects.select_related("user").get(
            id=challenge_id,
            used_at__isnull=True,
            expires_at__gt=timezone.now(),
            code_hash=_hash_code(code),
        )
    except LoginMfaChallenge.DoesNotExist as exc:
        raise ValueError("Invalid or expired verification code.") from exc

    challenge.used_at = timezone.now()
    challenge.save(update_fields=["used_at"])
    return challenge.user
