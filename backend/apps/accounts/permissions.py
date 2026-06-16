from rest_framework.permissions import BasePermission


class IsPatient(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_patient


class IsProvider(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_provider or request.user.is_staff
        )
