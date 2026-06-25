from __future__ import annotations

from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from apps.analytics.models import FunnelEvent


def _parse_range(start: str | None, end: str | None) -> tuple:
    end_dt = parse_datetime(end) if end else timezone.now()
    if end_dt is None:
        end_dt = timezone.now()
    start_dt = parse_datetime(start) if start else end_dt - timezone.timedelta(days=30)
    if start_dt is None:
        start_dt = end_dt - timezone.timedelta(days=30)
    return start_dt, end_dt


def funnel_step_counts(
    *,
    questionnaire_slug: str,
    start: str | None = None,
    end: str | None = None,
    experiment_id: str | None = None,
    variant_key: str | None = None,
) -> list[dict]:
    start_dt, end_dt = _parse_range(start, end)
    qs = FunnelEvent.objects.filter(
        questionnaire_slug=questionnaire_slug,
        created_at__gte=start_dt,
        created_at__lte=end_dt,
    )
    if experiment_id:
        qs = qs.filter(experiment_id=experiment_id)
    if variant_key:
        qs = qs.filter(variant_key=variant_key)

    viewed = (
        qs.filter(event_name="step_viewed")
        .values("step_key")
        .annotate(count=Count("id"))
        .order_by("step_key")
    )
    completed = (
        qs.filter(event_name="step_completed")
        .values("step_key")
        .annotate(count=Count("id"))
        .order_by("step_key")
    )
    completed_map = {row["step_key"]: row["count"] for row in completed}
    return [
        {
            "step_key": row["step_key"],
            "views": row["count"],
            "completions": completed_map.get(row["step_key"], 0),
        }
        for row in viewed
    ]


def dropoff_rates(
    *,
    questionnaire_slug: str,
    start: str | None = None,
    end: str | None = None,
) -> list[dict]:
    steps = funnel_step_counts(questionnaire_slug=questionnaire_slug, start=start, end=end)
    result = []
    for row in steps:
        views = row["views"] or 0
        completions = row["completions"] or 0
        dropoff = round(100.0 * (1 - completions / views), 2) if views else 0.0
        result.append({**row, "dropoff_percent": dropoff})
    return result


def events_by_day(
    *,
    questionnaire_slug: str | None = None,
    start: str | None = None,
    end: str | None = None,
) -> list[dict]:
    start_dt, end_dt = _parse_range(start, end)
    qs = FunnelEvent.objects.filter(created_at__gte=start_dt, created_at__lte=end_dt)
    if questionnaire_slug:
        qs = qs.filter(questionnaire_slug=questionnaire_slug)
    rows = (
        qs.annotate(day=TruncDate("created_at"))
        .values("day", "event_name")
        .annotate(count=Count("id"))
        .order_by("day", "event_name")
    )
    return [
        {
            "day": row["day"].isoformat() if row["day"] else None,
            "event_name": row["event_name"],
            "count": row["count"],
        }
        for row in rows
    ]
