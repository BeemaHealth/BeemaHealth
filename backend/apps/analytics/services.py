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


def _is_valid_step_key(step_key: str | None) -> bool:
    return bool(step_key and str(step_key).strip())


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
        created_at__gte=start_dt,
        created_at__lte=end_dt,
    )
    # Pin to a specific published version when provided. Events may still carry
    # the legacy questionnaire_type slug ("qualify"/"intake") rather than the
    # questionnaire's canonical slug, so version_id is authoritative.
    if version_id:
        try:
            qs = qs.filter(questionnaire_version_id=_uuid.UUID(version_id))
        except ValueError:
            qs = qs.filter(questionnaire_slug=questionnaire_slug)
    else:
        qs = qs.filter(questionnaire_slug=questionnaire_slug)
    if experiment_id:
        qs = qs.filter(experiment_id=experiment_id)
    if variant_key:
        qs = qs.filter(variant_key=variant_key)

    viewed_map = _distinct_participant_counts(qs, "step_viewed")
    completed_map = _distinct_participant_counts(qs, "step_completed")
    order_map = _step_order(qs)

    all_steps = sorted(
        {
            s
            for s in (set(viewed_map) | set(completed_map))
            if _is_valid_step_key(s)
        },
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
    version_id: str | None = None,
) -> dict[str, int]:
    """
    Return {step_key: count} of participants whose last recorded step event
    was at that step AND whose last activity is older than inactivity_hours.

    A participant is identified as COALESCE(funnel_session_id, user_id) so that
    both pre- and post-account flows are covered. Only participants whose last
    step event was recorded before the inactivity cutoff are counted — this
    distinguishes genuine abandonment from sessions still in progress.
    """
    import uuid as _uuid

    start_dt, end_dt = _parse_range(start, end)
    cutoff = timezone.now() - timezone.timedelta(hours=inactivity_hours)

    version_filter_sql = ""
    params: list = []
    if version_id:
        try:
            parsed_version = _uuid.UUID(version_id)
            version_filter_sql = "AND questionnaire_version_id = %s"
            params.append(str(parsed_version))
        except ValueError:
            pass
    if not version_filter_sql:
        version_filter_sql = "AND questionnaire_slug = %s"
        params.append(questionnaire_slug)

    if connection.vendor == "postgresql":
        participant_id = "COALESCE(funnel_session_id::text, user_id::text)"
    else:
        participant_id = "COALESCE(CAST(funnel_session_id AS TEXT), CAST(user_id AS TEXT))"

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            WITH last_per_participant AS (
                SELECT
                    {participant_id} AS participant_id,
                    step_key,
                    created_at,
                    ROW_NUMBER() OVER (
                        PARTITION BY {participant_id}
                        ORDER BY created_at DESC
                    ) AS rn
                FROM funnel_events
                WHERE event_name IN ('step_viewed', 'step_completed')
                  AND created_at >= %s
                  AND created_at <= %s
                  AND (funnel_session_id IS NOT NULL OR user_id IS NOT NULL)
                  {version_filter_sql}
            )
            SELECT step_key, COUNT(*) AS stopped_count
            FROM last_per_participant
            WHERE rn = 1
              AND created_at <= %s
              AND step_key <> ''
            GROUP BY step_key
            ORDER BY stopped_count DESC
            """,
            [start_dt, end_dt, *params, cutoff],
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
    stopped_map = session_last_steps(
        questionnaire_slug=questionnaire_slug,
        start=start,
        end=end,
        version_id=version_id,
    )
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


def _landing_page_name_by_slug() -> dict[str, str]:
    from apps.analytics.models import LandingPage

    return {lp.slug: lp.name for lp in LandingPage.objects.all()}


def _iter_page_view_event_rows(
    *,
    start_dt,
    end_dt,
):
    """Yield (day_iso, page_key, landing_page_slug, count) per aggregated row."""
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
    for row in rows:
        day = row["day"].isoformat() if row["day"] else "unknown"
        props = row["properties"] or {}
        page = props.get("page", "unknown")
        lp_slug = props.get("landing_page_slug") if page == "landing_page" else None
        if not lp_slug and isinstance(page, str) and page.startswith("lp:"):
            lp_slug = page[3:]
        yield day, page, lp_slug, row["count"]


def page_views_by_day(
    *,
    start: str | None = None,
    end: str | None = None,
) -> list[dict]:
    """Count page views (and reloads) per page per day.

    Landing page views (``landing_page`` events or ``lp:*`` page keys) are
    excluded — use ``landing_page_views_by_day`` for those.

    page_reloaded events are included because a hard reload is still a page
    view — the fix to only emit page_reloaded on actual browser reloads (not
    SPA route changes) was applied in analytics.ts, but we want historical
    page_reloaded events counted too.
    """
    start_dt, end_dt = _parse_range(start, end)
    aggregated: dict[str, dict[str, int]] = {}
    for day, page, lp_slug, count in _iter_page_view_event_rows(
        start_dt=start_dt, end_dt=end_dt
    ):
        if lp_slug:
            continue
        aggregated.setdefault(day, {}).setdefault(page, 0)
        aggregated[day][page] += count
    return [
        {"day": day, "page": page, "count": count}
        for day, pages in sorted(aggregated.items())
        for page, count in sorted(pages.items())
    ]


def landing_page_views_by_day(
    *,
    start: str | None = None,
    end: str | None = None,
) -> list[dict]:
    """Count landing page views per slug per day, with internal name resolved."""
    start_dt, end_dt = _parse_range(start, end)
    name_by_slug = _landing_page_name_by_slug()
    aggregated: dict[str, dict[str, int]] = {}
    for day, _page, lp_slug, count in _iter_page_view_event_rows(
        start_dt=start_dt, end_dt=end_dt
    ):
        if not lp_slug:
            continue
        aggregated.setdefault(day, {}).setdefault(lp_slug, 0)
        aggregated[day][lp_slug] += count
    return [
        {
            "day": day,
            "slug": slug,
            "name": name_by_slug.get(slug, slug),
            "count": count,
        }
        for day, slugs in sorted(aggregated.items())
        for slug, count in sorted(slugs.items())
    ]


def questionnaire_version_stats(
    *,
    questionnaire_slug: str,
    start: str | None = None,
    end: str | None = None,
) -> list[dict]:
    """Return per-version session counts for a questionnaire.

    Includes CTA ids and intake routing info so the analytics UI can display
    which qualify versions map to which CTAs and which intake questionnaires.
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
        str(v.id): v
        for v in QuestionnaireVersion.objects.filter(id__in=list(counts))
    }
    return sorted(
        [
            {
                "version_id": vid,
                "version_label": version_meta[vid].version_label if vid in version_meta else "unknown",
                "status": version_meta[vid].status if vid in version_meta else "unknown",
                "cta_ids": list(version_meta[vid].cta_ids or []) if vid in version_meta else [],
                "is_default_entry": version_meta[vid].is_default_entry if vid in version_meta else False,
                "intake_routing_rules": list(version_meta[vid].intake_routing_rules or []) if vid in version_meta else [],
                "sessions": cnt,
            }
            for vid, cnt in counts.items()
        ],
        key=lambda x: -x["sessions"],
    )


def questionnaire_versions_list(
    *,
    questionnaire_type: str,
    start: str | None = None,
    end: str | None = None,
) -> list[dict]:
    """Return ALL versions for the given questionnaire type, with session counts.

    Ordered newest-created-first. Includes versions with zero sessions so staff
    can see the full history including drafts and archived versions.
    """
    from apps.questionnaires.models import QuestionnaireVersion

    start_dt, end_dt = _parse_range(start, end)

    versions = list(
        QuestionnaireVersion.objects.filter(
            questionnaire__questionnaire_type=questionnaire_type,
        )
        .select_related("questionnaire")
        .order_by("-created_at")
    )

    version_ids = [v.id for v in versions]
    qs_base = FunnelEvent.objects.filter(
        event_name="step_viewed",
        questionnaire_version_id__in=version_ids,
        created_at__gte=start_dt,
        created_at__lte=end_dt,
    )
    session_rows = (
        qs_base.filter(funnel_session__isnull=False)
        .values("questionnaire_version_id")
        .annotate(n=Count("funnel_session", distinct=True))
    )
    user_rows = (
        qs_base.filter(funnel_session__isnull=True, user__isnull=False)
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

    return [
        {
            "version_id": str(v.id),
            "version_label": v.version_label,
            "questionnaire_slug": v.questionnaire.slug,
            "questionnaire_title": v.questionnaire.title,
            "status": v.status,
            "published_at": v.published_at.isoformat() if v.published_at else None,
            "created_at": v.created_at.isoformat(),
            "is_default_entry": v.is_default_entry,
            "cta_ids": list(v.cta_ids or []),
            "intake_routing_rules": list(v.intake_routing_rules or []),
            "sessions": counts.get(str(v.id), 0),
        }
        for v in versions
    ]


def questionnaire_step_analytics(
    *,
    version_id: str,
    start: str | None = None,
    end: str | None = None,
) -> dict | None:
    """Per-step analytics for a specific questionnaire version.

    Returns views, completions, dropoff, and answer-distribution for every
    field in every step — combining FunnelEvent counts with stored
    questionnaire_responses from EligibilityResponse / MedicalIntake.
    """
    import uuid as _uuid
    from apps.questionnaires.models import Questionnaire
    from apps.questionnaires.services import get_version_by_id

    start_dt, end_dt = _parse_range(start, end)
    cutoff = timezone.now() - timezone.timedelta(hours=2)

    try:
        parsed_id = _uuid.UUID(str(version_id))
    except ValueError:
        return None

    version = get_version_by_id(parsed_id)
    if not version:
        return None

    q_type = version.questionnaire.questionnaire_type
    q_slug = version.questionnaire.slug

    # ── Funnel event counts per step ──────────────────────────────────────────
    funnel_qs = FunnelEvent.objects.filter(
        questionnaire_version_id=parsed_id,
        created_at__gte=start_dt,
        created_at__lte=end_dt,
    )
    viewed_map = _distinct_participant_counts(funnel_qs, "step_viewed")
    completed_map = _distinct_participant_counts(funnel_qs, "step_completed")

    # Actual edge traversal counts. These are participant-level transitions
    # between adjacent distinct step_viewed events, so a node with multiple
    # upstream routes does not inflate every inbound edge's target count.
    edge_transition_map: dict[tuple[str, str], int] = {}
    viewed_rows = (
        funnel_qs.filter(event_name="step_viewed")
        .exclude(step_key="")
        .values("funnel_session_id", "user_id", "step_key", "created_at")
        .order_by("funnel_session_id", "user_id", "created_at", "id")
    )
    sequences: dict[str, list[str]] = {}
    for row in viewed_rows:
        participant = row["funnel_session_id"] or row["user_id"]
        if not participant:
            continue
        key = str(participant)
        step_key = row["step_key"]
        seq = sequences.setdefault(key, [])
        if not seq or seq[-1] != step_key:
            seq.append(step_key)
    for seq in sequences.values():
        for source_step, target_step in zip(seq, seq[1:]):
            edge_transition_map[(source_step, target_step)] = (
                edge_transition_map.get((source_step, target_step), 0) + 1
            )

    # Stopped-here counts (same window, filtered by version)
    if connection.vendor == "postgresql":
        participant_id = "COALESCE(funnel_session_id::text, user_id::text)"
    else:
        participant_id = (
            "COALESCE(CAST(funnel_session_id AS TEXT), CAST(user_id AS TEXT))"
        )

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            WITH last_per_participant AS (
                SELECT
                    {participant_id} AS pid,
                    step_key,
                    created_at,
                    ROW_NUMBER() OVER (
                        PARTITION BY {participant_id}
                        ORDER BY created_at DESC
                    ) AS rn
                FROM funnel_events
                WHERE questionnaire_version_id = %s
                  AND event_name IN ('step_viewed', 'step_completed')
                  AND created_at >= %s AND created_at <= %s
                  AND (funnel_session_id IS NOT NULL OR user_id IS NOT NULL)
            )
            SELECT step_key, COUNT(*) FROM last_per_participant
            WHERE rn = 1 AND created_at <= %s
            GROUP BY step_key
            """,
            [str(parsed_id), start_dt, end_dt, cutoff],
        )
        stopped_map = {row[0]: row[1] for row in cursor.fetchall()}

    # ── Response distributions ────────────────────────────────────────────────
    if q_type == Questionnaire.QuestionnaireType.QUALIFY:
        from apps.eligibility.models import EligibilityResponse

        recs = list(
            EligibilityResponse.objects.filter(
                questionnaire_version_id=parsed_id,
                created_at__gte=start_dt,
                created_at__lte=end_dt,
            ).values_list("questionnaire_responses", flat=True)
        )
    else:
        from apps.intakes.models import MedicalIntake

        recs = list(
            MedicalIntake.objects.filter(
                questionnaire_version_id=parsed_id,
                created_at__gte=start_dt,
                created_at__lte=end_dt,
            ).values_list("questionnaire_responses", flat=True)
        )

    all_responses = [r for r in recs if r and isinstance(r, dict)]
    total_respondents = len(all_responses)

    # ── Build output ──────────────────────────────────────────────────────────
    steps_out = []
    for step in version.steps.prefetch_related("fields").all():
        views = viewed_map.get(step.step_key, 0)
        completions = completed_map.get(step.step_key, 0)
        stopped = stopped_map.get(step.step_key, 0)
        dropoff_pct = round(100.0 * (1 - completions / views), 1) if views else 0.0

        fields_out = []
        for field in step.fields.all():
            if field.field_type in ("password", "plugin"):
                continue

            # Tally actual responses for this field
            value_counts: dict[str, int] = {}
            for resp in all_responses:
                raw = resp.get(field.field_key)
                if raw is None or raw == "":
                    continue
                if isinstance(raw, list):
                    for item in raw:
                        k = str(item)
                        value_counts[k] = value_counts.get(k, 0) + 1
                else:
                    k = str(raw)
                    value_counts[k] = value_counts.get(k, 0) + 1

            option_label_map = {
                str(o.get("value", "")): str(o.get("label", o.get("value", "")))
                for o in (field.options or [])
                if isinstance(o, dict)
            }
            total_ans = sum(value_counts.values())

            # Build distribution over all defined options (0-count entries included so
            # staff can see the full answer set even before anyone has responded).
            # Free-text fields only list options that have at least one response.
            if option_label_map:
                all_keys = list(option_label_map.keys())
                for k in value_counts:
                    if k not in all_keys:
                        all_keys.append(k)
                distribution = sorted(
                    [
                        {
                            "value": v,
                            "label": option_label_map.get(v, v),
                            "count": value_counts.get(v, 0),
                            "pct": round(100.0 * value_counts.get(v, 0) / total_ans, 1)
                            if total_ans
                            else 0.0,
                        }
                        for v in all_keys
                    ],
                    key=lambda x: -x["count"],
                )
            else:
                distribution = sorted(
                    [
                        {
                            "value": v,
                            "label": v,
                            "count": c,
                            "pct": round(100.0 * c / total_ans, 1),
                        }
                        for v, c in value_counts.items()
                    ],
                    key=lambda x: -x["count"],
                )

            fields_out.append({
                "field_key": field.field_key,
                "label": field.label,
                "field_type": field.field_type,
                "answer_distribution": distribution,
                "total_answers": total_ans,
            })

        steps_out.append({
            "step_key": step.step_key,
            "title": step.title,
            "views": views,
            "completions": completions,
            "dropoff_percent": dropoff_pct,
            "stopped_sessions": stopped,
            "fields": fields_out,
        })

    return {
        "version_id": str(version.id),
        "version_label": version.version_label,
        "questionnaire_slug": q_slug,
        "questionnaire_type": q_type,
        "questionnaire_title": version.questionnaire.title,
        "is_default_entry": version.is_default_entry,
        "status": version.status,
        "cta_ids": list(version.cta_ids or []),
        "intake_routing_rules": list(version.intake_routing_rules or []),
        "total_respondents": total_respondents,
        "edge_transitions": [
            {
                "source_step_key": source_step,
                "target_step_key": target_step,
                "count": count,
            }
            for (source_step, target_step), count in sorted(edge_transition_map.items())
        ],
        "steps": steps_out,
    }


def available_questionnaire_slugs(
    *,
    start: str | None = None,
    end: str | None = None,
) -> list[str]:
    """Return questionnaire slugs that have recorded step events in the window."""
    start_dt, end_dt = _parse_range(start, end)
    return sorted(
        FunnelEvent.objects.filter(
            event_name__in=["step_viewed", "step_completed"],
            questionnaire_slug__gt="",
            created_at__gte=start_dt,
            created_at__lte=end_dt,
        )
        .values_list("questionnaire_slug", flat=True)
        .distinct()
    )


def cta_performance(
    *,
    start: str | None = None,
    end: str | None = None,
) -> list[dict]:
    """Return per-CTA session and conversion counts.

    Groups funnel sessions by cta_id. Sessions with no cta_id are grouped as
    "(direct)" to represent users who arrived without a tracked CTA.
    """
    from apps.eligibility.models import FunnelSession

    start_dt, end_dt = _parse_range(start, end)
    rows = (
        FunnelSession.objects.filter(created_at__gte=start_dt, created_at__lte=end_dt)
        .values("cta_id")
        .annotate(
            sessions=Count("id"),
            accounts=Count("claimed_by_user", distinct=True),
        )
        .order_by("-sessions")
    )
    result = []
    for r in rows:
        s = r["sessions"]
        a = r["accounts"]
        result.append({
            "cta_id": r["cta_id"] or "(direct)",
            "sessions": s,
            "accounts_created": a,
            "conversion_rate": round(100.0 * a / s, 2) if s else 0.0,
        })
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
