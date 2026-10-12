"""DRF permission classes and the patient lookup helper."""
from __future__ import annotations

from typing import Any

from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission

from . import policy
from .models import User


def get_patient_profile(user: Any) -> Any:
    """Return the user's PatientProfile or raise ``PermissionDenied``."""
    if user is None or not getattr(user, "is_authenticated", False) or not user.is_active:
        raise PermissionDenied("Patient account required.")
    profile = getattr(user, "patient_profile", None) if user.kind == User.Kind.PATIENT else None
    if profile is None:
        raise PermissionDenied("Patient account required.")
    return profile


class IsPatient(BasePermission):
    """Authenticated, active patient user with a profile."""

    def has_permission(self, request: Any, view: Any) -> bool:
        try:
            get_patient_profile(request.user)
        except PermissionDenied:
            return False
        return True


class IsStaffUser(BasePermission):
    """Authenticated, active staff user (or superuser)."""

    def has_permission(self, request: Any, view: Any) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and user.is_active and (user.is_superuser or user.kind == User.Kind.STAFF))


class HasGrant(BasePermission):
    """Requires an active grant. Configure with class attrs or view attrs
    ``required_roles`` and ``required_scope``; see ``grant_required``.
    """

    roles: tuple[str, ...] | None = None
    scope: Any = None

    def has_permission(self, request: Any, view: Any) -> bool:
        roles = getattr(view, "required_roles", self.roles)
        scope = getattr(view, "required_scope", self.scope)
        return policy.has_grant(request.user, role=roles, scope=scope)


def grant_required(*roles: str, scope: Any = None) -> type[HasGrant]:
    """Build a HasGrant subclass fixed to the given roles and scope."""
    return type("HasGrantFor", (HasGrant,), {"roles": roles or None, "scope": scope})


class IsOwnerPatient(BasePermission):
    """Object level: the object belongs to the requesting patient."""

    def has_permission(self, request: Any, view: Any) -> bool:
        return IsPatient().has_permission(request, view)

    def has_object_permission(self, request: Any, view: Any, obj: Any) -> bool:
        try:
            profile = get_patient_profile(request.user)
        except PermissionDenied:
            return False
        if getattr(obj, "user_id", None) is not None and obj.__class__.__name__ == "PatientProfile":
            return obj.pk == profile.pk
        return getattr(obj, "patient_id", None) == profile.pk
