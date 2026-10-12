from __future__ import annotations

from typing import Any

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone

from apps.common.crypto import EncryptedTextField
from apps.common.models import BaseModel
from apps.common.utils import normalize_email


class UserManager(BaseUserManager["User"]):
    """Manager for the email-keyed user."""

    use_in_migrations = True

    def _create(self, email: str, password: str | None, **extra: Any) -> "User":
        email = normalize_email(email)
        if not email:
            raise ValueError("An email address is required.")
        user = self.model(email=email, **extra)
        if password:
            user.set_password(password)
            user.password_changed_at = timezone.now()
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_user(self, email: str, password: str | None = None, **extra: Any) -> "User":
        extra.setdefault("kind", User.Kind.PATIENT)
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create(email, password, **extra)

    def create_superuser(self, email: str, password: str | None = None, **extra: Any) -> "User":
        extra.setdefault("kind", User.Kind.STAFF)
        extra["is_staff"] = True
        extra["is_superuser"] = True
        if not password:
            raise ValueError("Superusers require a password.")
        return self._create(email, password, **extra)

    def get_by_natural_key(self, username: str) -> "User":
        return self.get(email__iexact=normalize_email(username))


class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    """Portal and admin account. Email is the login identifier."""

    class Kind(models.TextChoices):
        PATIENT = "patient", "Patient"
        STAFF = "staff", "Staff"
        SYSTEM = "system", "System"

    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=16, blank=True, help_text="E.164, e.g. +15555550123")
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.PATIENT, db_index=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False, help_text="Can sign in to Django Admin.")
    timezone = models.CharField(max_length=64, default="America/New_York")
    language = models.CharField(max_length=10, default="en")
    avatar_s3_key = models.CharField(max_length=512, blank=True)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    phone_verified_at = models.DateTimeField(null=True, blank=True)
    mfa_enabled = models.BooleanField(default=False)
    mfa_secret = EncryptedTextField(blank=True, default="")
    failed_login_count = models.PositiveIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    password_changed_at = models.DateTimeField(null=True, blank=True)
    terms_accepted_at = models.DateTimeField(null=True, blank=True)
    terms_version = models.CharField(max_length=32, blank=True)
    deactivated_at = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    class Meta(BaseModel.Meta):
        constraints = [models.UniqueConstraint(Lower("email"), name="accounts_user_email_ci_unique")]

    def __str__(self) -> str:
        return f"User {self.id} ({self.kind})"

    def save(self, *args: Any, **kwargs: Any) -> None:
        self.email = normalize_email(self.email)
        super().save(*args, **kwargs)

    @property
    def is_locked(self) -> bool:
        return bool(self.locked_until and self.locked_until > timezone.now())

    def get_full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self) -> str:
        return self.first_name


class Organization(BaseModel):
    """Beema itself, a doctor network, or a pharmacy."""

    class Kind(models.TextChoices):
        BEEMA = "beema", "Beema"
        NETWORK = "network", "Doctor network"
        PHARMACY = "pharmacy", "Pharmacy"

    kind = models.CharField(max_length=10, choices=Kind.choices, db_index=True)
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)
    integration_adapter = models.CharField(max_length=50, blank=True, help_text="Adapter key, e.g. beluga or lifefile.")
    config = models.JSONField(default=dict, blank=True, help_text="Non-secret settings only.")
    notes = models.TextField(blank=True)

    class Meta(BaseModel.Meta):
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.kind})"


class Grant(BaseModel):
    """A role a staff user holds within one organization."""

    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        CLINICIAN = "clinician", "Clinician"
        SUPPORT = "support", "Support"
        CUSTOMER_SUCCESS = "customer_success", "Customer success"
        READ_ONLY = "read_only", "Read only"

    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="grants")
    organization = models.ForeignKey("accounts.Organization", on_delete=models.CASCADE, related_name="grants")
    role = models.CharField(max_length=20, choices=Role.choices)
    is_active = models.BooleanField(default=True)

    class Meta(BaseModel.Meta):
        constraints = [models.UniqueConstraint(fields=["user", "organization", "role"], name="accounts_grant_unique")]

    def __str__(self) -> str:
        return f"Grant {self.role} user={self.user_id} org={self.organization_id}"


class StaffProfile(BaseModel):
    """How a staff member appears to patients in chat."""

    class MessageRole(models.TextChoices):
        CUSTOMER_SUCCESS = "customer_success", "Customer success"
        SUPPORT = "support", "Support"
        ADMIN = "admin", "Admin"

    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="staff_profile")
    display_title = models.CharField(max_length=100, blank=True, help_text='e.g. "Customer Success Manager"')
    display_name = models.CharField(max_length=100, blank=True)
    message_role = models.CharField(max_length=20, choices=MessageRole.choices, default=MessageRole.SUPPORT)
    npi = models.CharField(max_length=10, blank=True)

    def __str__(self) -> str:
        return f"StaffProfile user={self.user_id}"


class MagicLinkToken(BaseModel):
    """Single use login or verification credential. Only hashes are stored."""

    class Purpose(models.TextChoices):
        LOGIN = "login", "Login"
        CLAIM = "claim", "Claim"
        EMAIL_VERIFY = "email_verify", "Email verify"

    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="magic_links")
    token_hash = models.CharField(max_length=64, unique=True)
    code_hash = models.CharField(max_length=64, blank=True)
    purpose = models.CharField(max_length=20, choices=Purpose.choices, default=Purpose.LOGIN)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    attempts = models.PositiveIntegerField(default=0)
    requested_ip = models.GenericIPAddressField(null=True, blank=True)

    def __str__(self) -> str:
        return f"MagicLinkToken {self.id} ({self.purpose})"

    @property
    def is_usable(self) -> bool:
        return self.used_at is None and self.expires_at > timezone.now()
