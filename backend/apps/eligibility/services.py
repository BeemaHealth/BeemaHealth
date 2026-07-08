import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.eligibility.models import EligibilityResponse, FunnelSession
from apps.intakes.services import compute_age, compute_bmi

COOKIE_NAME = "beemahealth_funnel"
COOKIE_MAX_AGE = 30 * 24 * 3600


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def get_client_ip(request) -> str | None:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def create_funnel_session(
    request,
    *,
    utm: dict | None = None,
    landing_page_slug: str = "",
    cta_id: str = "",
) -> tuple[FunnelSession, str]:
    from apps.questionnaires.services import (
        assign_experiment_variant,
        get_default_qualify_version,
        get_qualify_version_for_cta,
    )

    ip = get_client_ip(request)
    ua = (request.META.get("HTTP_USER_AGENT") or "")[:512]

    # Dedup: if the same browser (IP + user-agent) already has an active session
    # within the last 2 hours, re-issue a fresh token tied to that session so we
    # don't create duplicate funnel records per device.
    if ip and ua:
        dedup_cutoff = timezone.now() - timedelta(hours=2)
        existing = (
            FunnelSession.objects.filter(
                ip_address=ip,
                user_agent=ua,
                status=FunnelSession.Status.ACTIVE,
                expires_at__gt=timezone.now(),
                created_at__gte=dedup_cutoff,
            )
            .order_by("-created_at")
            .first()
        )
        if existing:
            token = secrets.token_urlsafe(32)
            existing.token_hash = hash_token(token)
            update_fields = ["token_hash", "updated_at"]
            if cta_id and not existing.cta_id:
                existing.cta_id = str(cta_id)[:64]
                update_fields.append("cta_id")
            # Re-pin the deduped session to the currently-published qualify
            # version, but only while no answers exist yet — this keeps repeat
            # visits (and stale test sessions) pointed at the latest published
            # qualify version instead of an older one captured earlier. A CTA
            # resolves to its mapped version; otherwise the default entry is used.
            eligibility = EligibilityResponse.objects.filter(
                funnel_session=existing
            ).first()
            if eligibility is None or not eligibility.questionnaire_responses:
                effective_cta = cta_id or existing.cta_id
                resolved = (
                    get_qualify_version_for_cta(effective_cta)
                    if effective_cta
                    else get_default_qualify_version()
                )
                if resolved is not None and (
                    existing.qualify_questionnaire_version_id != resolved.id
                ):
                    existing.qualify_questionnaire_version_id = resolved.id
                    update_fields.append("qualify_questionnaire_version_id")
                    if eligibility is not None:
                        eligibility.questionnaire_version_id = resolved.id
                        eligibility.save(
                            update_fields=[
                                "questionnaire_version_id",
                                "updated_at",
                            ]
                        )
            existing.save(update_fields=update_fields)
            return existing, token

    token = secrets.token_urlsafe(32)
    expires_at = timezone.now() + timedelta(days=30)
    utm = utm or {}
    # CTA-mapped qualify entry takes precedence; otherwise fall back to the
    # experiment/default-qualify selection.
    cta_version = get_qualify_version_for_cta(cta_id) if cta_id else None
    if cta_version is not None:
        experiment_id, variant_key, version_id = None, "", cta_version.id
    else:
        experiment_id, variant_key, version_id = assign_experiment_variant("qualify")
    session = FunnelSession.objects.create(
        token_hash=hash_token(token),
        expires_at=expires_at,
        ip_address=ip,
        user_agent=ua,
        utm_source=str(utm.get("utm_source", ""))[:128],
        utm_medium=str(utm.get("utm_medium", ""))[:128],
        utm_campaign=str(utm.get("utm_campaign", ""))[:128],
        utm_content=str(utm.get("utm_content", ""))[:128],
        landing_page_slug=str(landing_page_slug)[:64],
        cta_id=str(cta_id)[:64],
        experiment_id=experiment_id,
        variant_key=variant_key or "",
        qualify_questionnaire_version_id=version_id,
    )
    EligibilityResponse.objects.create(
        funnel_session=session,
        questionnaire_version_id=version_id,
    )
    return session, token


def get_funnel_session(request) -> FunnelSession | None:
    token = request.COOKIES.get(COOKIE_NAME)
    if not token:
        return None
    try:
        return FunnelSession.objects.get(
            token_hash=hash_token(token),
            status=FunnelSession.Status.ACTIVE,
            expires_at__gt=timezone.now(),
        )
    except FunnelSession.DoesNotExist:
        return None


def get_or_create_eligibility_for_session(session: FunnelSession) -> EligibilityResponse:
    eligibility, _ = EligibilityResponse.objects.get_or_create(funnel_session=session)
    return eligibility


def reconcile_funnel_version(
    session: FunnelSession, eligibility: EligibilityResponse
) -> EligibilityResponse:
    """Keep a funnel session pointed at the live qualify version.

    If the session is pinned to a qualify version that is no longer published
    (it was superseded/archived), re-pin to the current live version (the one
    mapped to the session's CTA, else the default entry) and drop stale answers
    captured against the now-dead schema. No-op while the pinned version is
    still published.
    """
    from apps.questionnaires.models import QuestionnaireVersion
    from apps.questionnaires.services import (
        get_default_qualify_version,
        get_qualify_version_for_cta,
    )

    pinned_id = session.qualify_questionnaire_version_id
    if not pinned_id:
        return eligibility
    still_published = QuestionnaireVersion.objects.filter(
        id=pinned_id,
        status=QuestionnaireVersion.Status.PUBLISHED,
    ).exists()
    if still_published:
        return eligibility

    resolved = (
        get_qualify_version_for_cta(session.cta_id)
        if session.cta_id
        else get_default_qualify_version()
    )
    if resolved is None or resolved.id == pinned_id:
        return eligibility

    session.qualify_questionnaire_version_id = resolved.id
    session.save(
        update_fields=["qualify_questionnaire_version_id", "updated_at"]
    )
    eligibility.questionnaire_version_id = resolved.id
    eligibility.questionnaire_responses = {}
    eligibility.selected_intake_questionnaire_slug = ""
    eligibility.save(
        update_fields=[
            "questionnaire_version_id",
            "questionnaire_responses",
            "selected_intake_questionnaire_slug",
            "updated_at",
        ]
    )
    return eligibility


def set_funnel_cookie(response, token: str) -> None:
    response.set_cookie(
        COOKIE_NAME,
        token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        samesite="Lax",
        secure=not settings.DEBUG,
    )


def clear_funnel_cookie(response) -> None:
    response.delete_cookie(COOKIE_NAME)


def claim_funnel_session(session: FunnelSession, user) -> EligibilityResponse | None:
    with transaction.atomic():
        funnel_eligibility = EligibilityResponse.objects.filter(funnel_session=session).first()
        existing_eligibility = EligibilityResponse.objects.filter(user=user).first()
        claimed_eligibility = existing_eligibility

        if funnel_eligibility:
            if existing_eligibility:
                _merge_funnel_eligibility_into_existing(
                    existing_eligibility, funnel_eligibility, user
                )
                funnel_eligibility.delete()
            else:
                funnel_eligibility.user = user
                funnel_eligibility.funnel_session = None
                if funnel_eligibility.dob and not user.dob:
                    user.dob = funnel_eligibility.dob
                if funnel_eligibility.state and not user.state:
                    user.state = funnel_eligibility.state
                user.save()
                _sync_patient_profile(user, funnel_eligibility)
                _clear_claimed_identity_from_eligibility(funnel_eligibility)
                claimed_eligibility = funnel_eligibility

        session.claimed_by_user = user
        session.claimed_at = timezone.now()
        session.status = FunnelSession.Status.CLAIMED
        session.save()
        return claimed_eligibility


def _merge_funnel_eligibility_into_existing(
    existing: EligibilityResponse,
    funnel: EligibilityResponse,
    user,
) -> None:
    """Merge draft funnel answers into the user's existing eligibility row."""
    if funnel.dob and not user.dob:
        user.dob = funnel.dob
    if funnel.state and not user.state:
        user.state = funnel.state
    user.save()
    _sync_patient_profile(user, funnel)

    char_fields = (
        "treatment_interest",
        "primary_goal",
        "treatment_priority",
        "target_weight_loss_range",
        "disqualification_reason",
    )
    for field in char_fields:
        funnel_value = getattr(funnel, field)
        if funnel_value and not getattr(existing, field):
            setattr(existing, field, funnel_value)

    nullable_fields = (
        "height_ft",
        "height_in",
        "weight_lbs",
        "goal_weight_lbs",
        "bmi",
        "is_18_or_older",
        "is_likely_eligible",
        "completed_at",
    )
    for field in nullable_fields:
        funnel_value = getattr(funnel, field)
        if funnel_value is not None and getattr(existing, field) is None:
            setattr(existing, field, funnel_value)

    if funnel.safety_screen:
        merged = dict(existing.safety_screen or {})
        for key, value in funnel.safety_screen.items():
            if key not in merged or merged[key] in (None, ""):
                merged[key] = value
        existing.safety_screen = merged

    if funnel.pre_signup_consents:
        merged = dict(existing.pre_signup_consents or {})
        for key, value in funnel.pre_signup_consents.items():
            if key not in merged or merged[key] in (None, "", False):
                merged[key] = value
        existing.pre_signup_consents = merged

    if funnel.safety_concern_flag and not existing.safety_concern_flag:
        existing.safety_concern_flag = True
    if funnel.needs_clinician_review and not existing.needs_clinician_review:
        existing.needs_clinician_review = True

    if funnel.questionnaire_responses:
        merged_q = dict(existing.questionnaire_responses or {})
        merged_q.update(funnel.questionnaire_responses)
        existing.questionnaire_responses = merged_q
    if funnel.questionnaire_version_id and not existing.questionnaire_version_id:
        existing.questionnaire_version_id = funnel.questionnaire_version_id
    if funnel.selected_intake_questionnaire_slug and not existing.selected_intake_questionnaire_slug:
        existing.selected_intake_questionnaire_slug = funnel.selected_intake_questionnaire_slug

    existing.save()


def _sync_patient_profile(user, eligibility: EligibilityResponse) -> None:
    from apps.patients.models import PatientProfile

    profile, _ = PatientProfile.objects.get_or_create(user=user)
    if eligibility.sex_assigned_at_birth and not profile.sex_assigned_at_birth:
        profile.sex_assigned_at_birth = eligibility.sex_assigned_at_birth
    if eligibility.gender_identity and not profile.gender_identity:
        profile.gender_identity = eligibility.gender_identity
    elif (
        eligibility.sex_assigned_at_birth
        and not profile.gender_identity
    ):
        profile.gender_identity = eligibility.sex_assigned_at_birth
    profile.save()


def _clear_claimed_identity_from_eligibility(eligibility: EligibilityResponse) -> None:
    """Identity fields live on users/patient_profiles after account creation."""
    eligibility.dob = None
    eligibility.state = ""
    eligibility.sex_assigned_at_birth = ""
    eligibility.gender_identity = ""
    eligibility.save(
        update_fields=[
            "user",
            "funnel_session",
            "dob",
            "state",
            "sex_assigned_at_birth",
            "gender_identity",
            "updated_at",
        ]
    )


def derive_eligibility_flags(eligibility: EligibilityResponse) -> None:
    # Excluded states that are not currently eligible for service
    EXCLUDED_STATES = {"NM", "KS", "WV"}

    safety = eligibility.safety_screen or {}
    eligibility.safety_concern_flag = any(v is True for v in safety.values())

    # Check state eligibility first
    state = eligibility.state
    if not state and eligibility.user_id:
        state = eligibility.user.state
    if state and state.upper() in EXCLUDED_STATES:
        eligibility.is_likely_eligible = False
        eligibility.needs_clinician_review = False
        eligibility.disqualification_reason = "state_not_eligible"
        return

    bmi = eligibility.bmi
    if bmi is None and eligibility.height_ft and eligibility.weight_lbs:
        bmi = compute_bmi(
            str(eligibility.height_ft),
            str(eligibility.height_in or 0),
            str(eligibility.weight_lbs),
        )
        eligibility.bmi = bmi

    dob = eligibility.dob
    if dob is None and eligibility.user_id:
        dob = eligibility.user.dob
    age = compute_age(dob) if dob else None
    if age is not None and age < 18:
        eligibility.is_likely_eligible = False
        eligibility.needs_clinician_review = False
        eligibility.disqualification_reason = "under_18"
        return

    if eligibility.is_18_or_older is False:
        eligibility.is_likely_eligible = False
        eligibility.needs_clinician_review = False
        eligibility.disqualification_reason = "under_18"
        return

    blocking = {"pregnant", "breastfeeding", "trying_to_conceive", "glp1_reaction"}
    if any(safety.get(k) is True for k in blocking):
        eligibility.is_likely_eligible = False
        eligibility.needs_clinician_review = False
        eligibility.disqualification_reason = "safety_screen"
        return

    if eligibility.safety_concern_flag:
        eligibility.is_likely_eligible = None
        eligibility.needs_clinician_review = True
        return

    if bmi is not None and bmi < 27:
        eligibility.is_likely_eligible = None
        eligibility.needs_clinician_review = True
        return

    eligibility.is_likely_eligible = True
    eligibility.needs_clinician_review = False
    eligibility.disqualification_reason = ""
