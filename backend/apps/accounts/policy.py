"""Authorization rules for staff and patient access. Superusers pass every check."""
from __future__ import annotations

import uuid
from typing import Any, Iterable

from .models import Grant, Organization, User

VIEW_ROLES = frozenset(r.value for r in Grant.Role)
EDIT_ROLES = frozenset({Grant.Role.ADMIN, Grant.Role.CLINICIAN, Grant.Role.SUPPORT})


def _active(user: Any) -> bool:
    return bool(user is not None and getattr(user, "is_authenticated", False) and user.is_active)


def has_grant(
    user: Any,
    role: str | Iterable[str] | None = None,
    scope: Organization | str | uuid.UUID | None = None,
) -> bool:
    """True when the user holds an active grant matching role (any of) and scope.

    ``scope`` may be an Organization, its slug, or its id. ``None`` means any organization.
    """
    if not _active(user):
        return False
    if user.is_superuser:
        return True
    qs = Grant.objects.filter(user=user, is_active=True, organization__is_active=True)
    if role is not None:
        roles = [role] if isinstance(role, str) else list(role)
        qs = qs.filter(role__in=[str(r) for r in roles])
    if scope is not None:
        if isinstance(scope, Organization):
            qs = qs.filter(organization=scope)
        elif isinstance(scope, uuid.UUID):
            qs = qs.filter(organization_id=scope)
        else:
            try:
                qs = qs.filter(organization_id=uuid.UUID(str(scope)))
            except ValueError:
                qs = qs.filter(organization__slug=str(scope))
    return qs.exists()


def _owns(user: User, patient_profile: Any) -> bool:
    return patient_profile is not None and patient_profile.user_id == user.id


def can_view_patient(user: Any, patient_profile: Any) -> bool:
    """Patients see only themselves. Staff need any active grant."""
    if not _active(user) or patient_profile is None:
        return False
    if user.is_superuser:
        return True
    if user.kind == User.Kind.PATIENT:
        return _owns(user, patient_profile)
    if user.kind == User.Kind.STAFF:
        return has_grant(user, role=VIEW_ROLES)
    return False


def can_edit_patient(user: Any, patient_profile: Any) -> bool:
    """Patients edit themselves. Staff need an admin, clinician, or support grant."""
    if not _active(user) or patient_profile is None:
        return False
    if user.is_superuser:
        return True
    if user.kind == User.Kind.PATIENT:
        return _owns(user, patient_profile)
    if user.kind == User.Kind.STAFF:
        return has_grant(user, role=EDIT_ROLES)
    return False
