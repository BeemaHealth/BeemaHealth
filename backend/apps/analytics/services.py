from __future__ import annotations

from django.db import connection
from django.db.models import Avg, Count, FloatField
from django.db.models.fields.json import KeyTextTransform
from django.db.models.functions import Cast, TruncDate
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from apps.analytics.models import FunnelEvent
from apps.eligibility.models import FunnelSession


def _parse_range(start: str | None, end: str | None) -> tuple:
    end_dt = parse_datetime(end) if end else timezone.now()
    if end_dt is None:
        end_dt = timezone.now()
    start_dt = parse_datetime(start) if start else end_dt - timezone.timedelta(days=30)
    if start_dt is None:
        start_dt = end_dt - timezone.timedelta(days=30)
    return start_dt, end_dt


def _distinct_participant_counts(qs, event_name: str) -> dict[str, int]:
    """
    Count unique participants per step_key for the given event_name.

    Pre-account events have funnel_session set (no user). Post-account events
    have user set (no funnel_session). The two sets are mutually exclusive
    because FunnelEventCreateView assigns exactly one of them per request.
    Summing distinct counts from both queries gives correct unique-visitor totals
    even when a user transitions from pre- to post-account mid-funnel.
    """
    session_rows = (
        qs.filter(event_name=event_name, funnel_session__isnull=False)
        .values("step_key")
        .annotate(n=Count("funnel_session", distinct=True))
    )
    user_rows = (
        qs.filter(event_name=event_name, funnel_session__isnull=True, user__isnull=False)
        .values("step_key")
        .annotate(n=Count("user", distinct=True))
    )
    result: dict[str, int] = {}
    for row in session_rows:
        result[row["step_key"]] = result.get(row["step_key"], 0) + row["n"]
    for row in user_rows:
        result[row["step_key"]] = result.get(row["step_key"], 0) + row["n"]
    return result


def _step_order(qs) -> dict[str, float]:
    """Return {step_key: avg_step_index} for funnel-order display."""
    rows = (
        qs.filter(event_name="step_viewed")
        .values("step_key")
        .annotate(
            avg_index=Avg(
                Cast(KeyTextTransform("step_index", "properties"), output_field=FloatField())
            )
        )
    )
    return {row["step_key"]: (row["avg_index"] if row["avg_index"] is not None else 9999.0) for row in rows}


def funnel_step_counts(
    *,
    questionnaire_slug: str,
    start: str | None = None,
    end: str | None = None,
    experiment_id: str | None = None,
    variant_key: str | None = None,
    version_id: str | None = None,
) -> list[dict]:
    import uuid as _uuid

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
    if version_id:
        try:
            qs = qs.filter(questionnaire_version_id=_uuid.UUID(version_id))
        except ValueError:
            pass

    viewed_map = _distinct_participant_counts(qs, "step_viewed")
    completed_map = _distinct_participant_counts(qs, "step_completed")
    order_map = _step_order(qs)

    all_steps = sorted(
        set(viewed_map) | set(completed_map),
        key=lambda s: (order_map.get(s, 9999.0), s),
    )
    return [
        {
            "step_key": step,
            "views": viewed_map.get(step, 0),
            "completions": completed_map.get(step, 0),
        }
        for step in all_steps
    ]


def session_last_steps(
    *,
    questionnaire_slug: str,
    start: str | None = None,
    end: str | None = None,
    inactivity_hours: int = 2,
) -> dict[str, int]:
    """
    Return {step_key: count} of participants whose last recorded step event
    was at that step AND whose last activity is older than inactivity_hours.

    A participant is identified as COALESCE(funnel_session_id, user_id) so that
    both pre- and post-account flows are covered. Only participants whose last
    step event was recorded before the inactivity cutoff are counted — this
    distinguishes genuine abandonment from sessions still in progress.
    """
    start_dt, end_dt = _parse_range(start, end)
    cutoff = timezone.now() - timezone.timedelta(hours=inactivity_hours)

    with connection.cursor() as cursor:
        cursor.execute(
            """
            WITH last_per_participant AS (
                SELECT
                    COALESCE(funnel_session_id::text, user_id::text) AS participant_id,
                    step_key,
                    created_at,
                    ROW_NUMBER() OVER (
                        PARTITION BY COALESCE(funnel_session_id::text, user_id::text)
                        ORDER BY created_at DESC
                    ) AS rn
                FROM funnel_events
                WHERE questionnaire_slug = %s
                  AND event_name IN ('step_viewed', 'step_completed')
                  AND created_at >= %s
                  AND created_at <= %s
                  AND (funnel_session_id IS NOT NULL OR user_id IS NOT NULL)
            )
            SELECT step_key, COUNT(*) AS stopped_count
            FROM last_per_participant
            WHERE rn = 1
              AND created_at <= %s
            GROUP BY step_key
            ORDER BY stopped_count DESC
            """,
            [questionnaire_slug, start_dt, end_dt, cutoff],
        )
        return {row[0]: row[1] for row in cursor.fetchall()}


def dropoff_rates(
    *,
    questionnaire_slug: str,
    start: str | None = None,
    end: str | None = None,
    version_id: str | None = None,
) -> list[dict]:
    steps = funnel_step_counts(
        questionnaire_slug=questionnaire_slug, start=start, end=end, version_id=version_id
    )
    stopped_map = session_last_steps(questionnaire_slug=questionnaire_slug, start=start, end=end)
    result = []
    for row in steps:
        views = row["views"] or 0
        completions = row["completions"] or 0
        dropoff = round(100.0 * (1 - completions / views), 2) if views else 0.0
        result.append({
            **row,
            "dropoff_percent": dropoff,
            "stopped_sessions": stopped_map.get(row["step_key"], 0),
        })
    return result


def _clean_utm(value: str | None) -> str:
    """Normalize UTM values. The string 'None' is a legacy artifact from a bug
    where str(None) was written to the DB; treat it the same as empty."""
    if not value or value == "None":
        return ""
    return value


def traffic_sources(
    *,
    start: str | None = None,
    end: str | None = None,
) -> list[dict]:
    start_dt, end_dt = _parse_range(start, end)
    rows = (
        FunnelSession.objects.filter(created_at__gte=start_dt, created_at__lte=end_dt)
        .values("utm_source", "utm_medium", "utm_campaign")
        .annotate(
            sessions=Count("id"),
            accounts=Count("claimed_by_user", distinct=True),
        )
        .order_by("-sessions")
    )
    # Normalize and merge rows that differ only by legacy "None" vs empty string
    buckets: dict[tuple, dict] = {}
    for r in rows:
        src = _clean_utm(r["utm_source"])
        med = _clean_utm(r["utm_medium"])
        cam = _clean_utm(r["utm_campaign"])
        key = (src, med, cam)
        if key not in buckets:
            buckets[key] = {"sessions": 0, "accounts": 0}
        buckets[key]["sessions"] += r["sessions"]
        buckets[key]["accounts"] += r["accounts"]

    result = []
    for (src, med, cam), totals in sorted(buckets.items(), key=lambda x: -x[1]["sessions"]):
        s = totals["sessions"]
        a = totals["accounts"]
        result.append({
            "utm_source": src or "(direct)",
            "utm_medium": med,
            "utm_campaign": cam,
            "sessions": s,
            "accounts_created": a,
            "conversion_rate": round(100.0 * a / s, 2) if s else 0.0,
        })
    return result


def top_of_funnel_stats(
    *,
    start: str | None = None,
    end: str | None = None,
    inactivity_hours: int = 2,
) -> dict:
    """
    Returns the top-of-funnel conversion: home page → qualify started → account created.

    Counts distinct funnel sessions that:
    1. Had a page_viewed=home event in the time window (home_sessions)
    2. Also had a step_viewed on 'qualify' (started_qualify)
    3. Were claimed (account created) (accounts_created)

    abandoned_at_home = sessions that visited home but never started qualify,
    AND whose last recorded event is older than inactivity_hours (genuinely gone,
    not still browsing).
    """
    start_dt, end_dt = _parse_range(start, end)
    cutoff = timezone.now() - timezone.timedelta(hours=inactivity_hours)

    with connection.cursor() as cursor:
        cursor.execute(
            """
            WITH home_sessions AS (
                SELECT DISTINCT funnel_session_id
                FROM funnel_events
                WHERE event_name = 'page_viewed'
                  AND properties->>'page' = 'home'
                  AND funnel_session_id IS NOT NULL
                  AND created_at >= %s AND created_at <= %s
            ),
            qualify_starters AS (
                SELECT DISTINCT funnel_session_id
                FROM funnel_events
                WHERE event_name = 'step_viewed'
                  AND questionnaire_slug = 'qualify'
                  AND funnel_session_id IS NOT NULL
            ),
            claimed_sessions AS (
                SELECT DISTINCT id
                FROM funnel_sessions
                WHERE status = 'claimed'
            )
            SELECT
                (SELECT COUNT(*) FROM home_sessions) AS home_sessions,
                (
                    SELECT COUNT(*) FROM home_sessions hs
                    WHERE hs.funnel_session_id IN (SELECT funnel_session_id FROM qualify_starters)
                ) AS started_qualify,
                (
                    SELECT COUNT(*) FROM home_sessions hs
                    JOIN claimed_sessions cs ON cs.id = hs.funnel_session_id
                ) AS accounts_created,
                (
                    SELECT COUNT(*) FROM home_sessions hs
                    WHERE hs.funnel_session_id NOT IN (SELECT funnel_session_id FROM qualify_starters)
                      AND NOT EXISTS (
                        SELECT 1 FROM funnel_events fe2
                        WHERE fe2.funnel_session_id = hs.funnel_session_id
                          AND fe2.created_at > %s
                      )
                ) AS abandoned_at_home
            """,
            [start_dt, end_dt, cutoff],
        )
        row = cursor.fetchone()
        home = row[0] or 0
        started = row[1] or 0
        accounts = row[2] or 0
        abandoned = row[3] or 0
        return {
            "home_sessions": home,
            "started_qualify": started,
            "accounts_created": accounts,
            "abandoned_at_home": abandoned,
            "home_to_qualify_rate": round(100.0 * started / home, 1) if home else 0.0,
            "home_to_account_rate": round(100.0 * accounts / home, 1) if home else 0.0,
        }


def landing_page_performance(
    *,
    start: str | None = None,
    end: str | None = None,
) -> list[dict]:
    start_dt, end_dt = _parse_range(start, end)
    rows = (
        FunnelSession.objects.filter(
            created_at__gte=start_dt,
            created_at__lte=end_dt,
            landing_page_slug__gt="",
        )
        .values("landing_page_slug")
        .annotate(
            sessions=Count("id"),
            accounts=Count("claimed_by_user", distinct=True),
        )
        .order_by("-sessions")
    )
    return [
        {
            "landing_page_slug": r["landing_page_slug"],
            "sessions": r["sessions"],
            "accounts_created": r["accounts"],
            "conversion_rate": round(100.0 * r["accounts"] / r["sessions"], 2) if r["sessions"] else 0.0,
        }
        for r in rows
    ]


def page_views_by_day(
    *,
    start: str | None = None,
    end: str | None = None,
) -> list[dict]:
    """Count page views (and reloads) per page per day.

    page_reloaded events are included because a hard reload is still a page
    view — the fix to only emit page_reloaded on actual browser reloads (not
    SPA route changes) was applied in analytics.ts, but we want historical
    page_reloaded events counted too.
    """
    start_dt, end_dt = _parse_range(start, end)
    rows = (
        FunnelEvent.objects.filter(
            event_name__in=["page_viewed", "page_reloaded"],
            created_at__gte=start_dt,
            created_at__lte=end_dt,
        )
        .annotate(day=TruncDate("created_at"))
        .values("day", "properties")
        .annotate(count=Count("id"))
        .order_by("day")
    )
    aggregated: dict[str, dict[str, int]] = {}
    for row in rows:
        day = row["day"].isoformat() if row["day"] else "unknown"
        props = row["properties"] or {}
        page = props.get("page", "unknown")
        # For landing pages, append the slug so each landing page gets its own row
        if page == "landing_page" and props.get("landing_page_slug"):
            page = f"lp:{props['landing_page_slug']}"
        aggregated.setdefault(day, {}).setdefault(page, 0)
        aggregated[day][page] += row["count"]
    return [
        {"day": day, "page": page, "count": count}
        for day, pages in sorted(aggregated.items())
        for page, count in sorted(pages.items())
    ]


def questionnaire_version_stats(
    *,
    questionnaire_slug: str,
    start: str | None = None,
    end: str | None = None,
) -> list[dict]:
    """Return per-version session counts for a questionnaire.

    Used by the staff analytics funnel section to show which questionnaire
    versions are in active use and allow per-version filtering.
    """
    from apps.questionnaires.models import QuestionnaireVersion

    start_dt, end_dt = _parse_range(start, end)
    qs = FunnelEvent.objects.filter(
        questionnaire_slug=questionnaire_slug,
        event_name="step_viewed",
        questionnaire_version_id__isnull=False,
        created_at__gte=start_dt,
        created_at__lte=end_dt,
    )
    session_rows = (
        qs.filter(funnel_session__isnull=False)
        .values("questionnaire_version_id")
        .annotate(n=Count("funnel_session", distinct=True))
    )
    user_rows = (
        qs.filter(funnel_session__isnull=True, user__isnull=False)
        .values("questionnaire_version_id")
        .annotate(n=Count("user", distinct=True))
    )
    counts: dict[str, int] = {}
    for row in session_rows:
        k = str(row["questionnaire_version_id"])
        counts[k] = counts.get(k, 0) + row["n"]
    for row in user_rows:
        k = str(row["questionnaire_version_id"])
        counts[k] = counts.get(k, 0) + row["n"]

    version_meta = {
        str(v["id"]): v
        for v in QuestionnaireVersion.objects.filter(id__in=list(counts)).values(
            "id", "version_label", "status"
        )
    }
    return sorted(
        [
            {
                "version_id": vid,
                "version_label": version_meta.get(vid, {}).get("version_label", "unknown"),
                "status": version_meta.get(vid, {}).get("status", "unknown"),
                "sessions": cnt,
            }
            for vid, cnt in counts.items()
        ],
        key=lambda x: -x["sessions"],
    )


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
