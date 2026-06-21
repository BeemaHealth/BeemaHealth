from rest_framework import permissions


class DoctorWebhookPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        from django.conf import settings

        secret = getattr(settings, "DOCTOR_WEBHOOK_SECRET", "")
        if not secret:
            return False
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            return auth[7:].strip() == secret
        return request.headers.get("X-Webhook-Secret", "") == secret


class LifeFileWebhookPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        import base64
        from django.conf import settings

        expected_user = getattr(settings, "LIFEFILE_WEBHOOK_USER", "")
        expected_pass = getattr(settings, "LIFEFILE_WEBHOOK_PASSWORD", "")
        if not expected_user or not expected_pass:
            return False
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Basic "):
            return False
        try:
            decoded = base64.b64decode(auth[6:]).decode("utf-8")
        except (ValueError, UnicodeDecodeError):
            return False
        username, _, password = decoded.partition(":")
        return username == expected_user and password == expected_pass
