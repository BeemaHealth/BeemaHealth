"""Passwordless login: issue and consume single use email tokens with account lockout.

Callers must give the same generic result whether or not an email is known.
"""
from __future__ import annotations

import hmac
import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from apps.common.utils import normalize_email, sha256_hex

from .models import MagicLinkToken, User

logger = logging.getLogger(__name__)


def _setting(name: str, default: int) -> int:
    return int(getattr(settings, name, default))


def token_ttl() -> timedelta:
    return timedelta(minutes=_setting("MAGIC_LINK_TTL_MINUTES", 15))


def hash_secret(value: str) -> str:
    """Hash a token or code with the server secret so a database leak cannot be replayed."""
    return sha256_hex(f"{settings.SECRET_KEY}:{value}")


def get_or_create_patient(email: str) -> User:
    """Return the user for an email, creating a patient user on first sight."""
    email = normalize_email(email)
    user = User.objects.filter(email__iexact=email).first()
    if user is None:
        user = User.objects.create_user(email=email)
    return user


def issue_token(user: User, purpose: str = MagicLinkToken.Purpose.LOGIN, ip: str | None = None) -> tuple[str, str]:
    """Create a token, supersede earlier unused ones, and return ``(token, code)``."""
    token = secrets.token_urlsafe(32)
    code = f"{secrets.randbelow(1_000_000):06d}"
    with transaction.atomic():
        MagicLinkToken.objects.filter(user=user, purpose=purpose, used_at__isnull=True).update(used_at=timezone.now())
        MagicLinkToken.objects.create(
            user=user,
            token_hash=hash_secret(token),
            code_hash=hash_secret(f"{user.pk}:{code}"),
            purpose=purpose,
            expires_at=timezone.now() + token_ttl(),
            requested_ip=ip,
        )
    return token, code


def send_login_email(user: User, token: str, code: str) -> None:
    """Email the link and code. Failures are logged by id and never surfaced to the caller."""
    link = f"{settings.PORTAL_BASE_URL.rstrip('/')}/portal/login/verify?token={token}"
    minutes = int(token_ttl().total_seconds() // 60)
    body = (
        "Use this code to sign in to Beema Health: "
        f"{code}\n\nOr open this link: {link}\n\n"
        f"It expires in {minutes} minutes and works once. If you did not request it, ignore this email."
    )
    try:
        send_mail(
            "Your Beema Health sign-in code",
            body,
            getattr(settings, "SES_FROM_EMAIL", None),
            [user.email],
            fail_silently=False,
        )
    except Exception as exc:  # noqa: BLE001 - delivery problems must not reveal account state
        logger.error("login email delivery failed user=%s error=%s", user.pk, type(exc).__name__)


def request_login(email: str, ip: str | None = None) -> None:
    """Issue and email a login token if the account can sign in. Silent otherwise."""
    email = normalize_email(email)
    existing = User.objects.filter(email__iexact=email).first()
    if existing is not None and (not existing.is_active or existing.is_locked):
        return
    user = existing or get_or_create_patient(email)
    token, code = issue_token(user, ip=ip)
    send_login_email(user, token, code)


def _register_failure(user: User) -> None:
    user.failed_login_count += 1
    if user.failed_login_count >= _setting("LOGIN_LOCKOUT_THRESHOLD", 5):
        user.locked_until = timezone.now() + timedelta(minutes=_setting("LOGIN_LOCKOUT_MINUTES", 15))
        user.failed_login_count = 0
    user.save(update_fields=["failed_login_count", "locked_until", "updated_at"])


def _complete(user: User, token: MagicLinkToken, ip: str | None) -> User | None:
    """Atomically burn the token; only one caller can win."""
    now = timezone.now()
    burned = MagicLinkToken.objects.filter(pk=token.pk, used_at__isnull=True, expires_at__gt=now).update(used_at=now)
    if not burned:
        return None
    user.failed_login_count = 0
    user.locked_until = None
    user.last_login_ip = ip
    if user.email_verified_at is None:
        user.email_verified_at = now
    user.save(update_fields=["failed_login_count", "locked_until", "last_login_ip", "email_verified_at", "updated_at"])
    return user


def consume_token(token: str, ip: str | None = None) -> User | None:
    """Verify a magic link token. Returns the user or ``None`` for any failure."""
    record = MagicLinkToken.objects.select_related("user").filter(token_hash=hash_secret(token)).first()
    if record is None:
        return None
    user = record.user
    if not user.is_active or user.is_locked or not record.is_usable:
        return None
    return _complete(user, record, ip)


def consume_code(email: str, code: str, ip: str | None = None) -> User | None:
    """Verify an emailed code. Wrong guesses count toward lockout. Returns user or ``None``."""
    user = User.objects.filter(email__iexact=normalize_email(email)).first()
    if user is None or not user.is_active or user.is_locked:
        return None
    record = (
        MagicLinkToken.objects.filter(user=user, used_at__isnull=True, expires_at__gt=timezone.now())
        .order_by("-created_at")
        .first()
    )
    if record is None:
        return None
    if record.attempts >= _setting("CODE_MAX_ATTEMPTS", 5):
        return None
    expected = record.code_hash
    if not hmac.compare_digest(expected, hash_secret(f"{user.pk}:{code.strip()}")):
        record.attempts += 1
        record.save(update_fields=["attempts", "updated_at"])
        _register_failure(user)
        return None
    return _complete(user, record, ip)
