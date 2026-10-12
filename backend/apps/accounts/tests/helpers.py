"""Test factories shared by foundation app tests."""
from __future__ import annotations

from itertools import count

from apps.accounts.models import Grant, Organization, StaffProfile, User
from apps.patients.models import PatientProfile

_n = count(1)


def make_patient(email: str | None = None, **extra) -> User:
    user = User.objects.create_user(email or f"patient{next(_n)}@example.com", **extra)
    PatientProfile.objects.create(user=user)
    return user


def make_org(slug: str | None = None, kind: str = Organization.Kind.BEEMA, **extra) -> Organization:
    slug = slug or f"org-{next(_n)}"
    return Organization.objects.create(name=slug.title(), slug=slug, kind=kind, **extra)


def make_staff(role: str | None = None, org: Organization | None = None, **extra) -> User:
    user = User.objects.create_user(f"staff{next(_n)}@example.com", kind=User.Kind.STAFF, is_staff=True, **extra)
    StaffProfile.objects.create(user=user, display_name="Staff")
    if role:
        Grant.objects.create(user=user, organization=org or make_org(), role=role)
    return user
