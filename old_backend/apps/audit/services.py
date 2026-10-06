from datetime import timedelta

from django.utils import timezone

from apps.audit.models import AuditEvent

READ_DEDUPE_SECONDS = 60


def get_client_ip(request) -> str | None:
    if request is None:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _should_skip_duplicate_read(*, user, action, resource_type, resource_id, request) -> bool:
    if action != "read":
        return False

    user_id = user.id if user and user.is_authenticated else None
    cutoff = timezone.now() - timedelta(seconds=READ_DEDUPE_SECONDS)
    filters = {
        "user_id": user_id,
        "action": action,
        "resource_type": resource_type,
        "resource_id": str(resource_id),
        "created_at__gte": cutoff,
    }
    qs = AuditEvent.objects.filter(**filters)
    if user_id is None:
        qs = qs.filter(ip_address=get_client_ip(request))
    return qs.exists()


def log_audit_event(*, user, action, resource_type, resource_id, request=None):
    if _should_skip_duplicate_read(
        user=user,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        request=request,
    ):
        return

    AuditEvent.objects.create(
        user=user if user and user.is_authenticated else None,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id),
        ip_address=get_client_ip(request),
        user_agent=(request.META.get("HTTP_USER_AGENT", "")[:512] if request else ""),
    )
