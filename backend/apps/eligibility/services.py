import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from apps.eligibility.models import EligibilityResponse, FunnelSession
from apps.intakes.services import compute_age, compute_bmi

COOKIE_NAME = "aretide_funnel"
COOKIE_MAX_AGE = 30 * 24 * 3600


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def get_client_ip(request) -> str | None:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def create_funnel_session(request) -> tuple[FunnelSession, str]:
    token = secrets.token_urlsafe(32)
    expires_at = timezone.now() + timedelta(days=30)
    session = FunnelSession.objects.create(
        token_hash=hash_token(token),
        expires_at=expires_at,
        ip_address=get_client_ip(request),
        user_agent=(request.META.get("HTTP_USER_AGENT") or "")[:512],
    )
    EligibilityResponse.objects.create(funnel_session=session)
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
    eligibility = EligibilityResponse.objects.filter(funnel_session=session).first()
    if eligibility:
        eligibility.user = user
        eligibility.funnel_session = None
        if eligibility.dob and not user.dob:
            user.dob = eligibility.dob
        if eligibility.state and not user.state:
            user.state = eligibility.state
        user.save()
        _sync_patient_profile(user, eligibility)
        _clear_claimed_identity_from_eligibility(eligibility)

    session.claimed_by_user = user
    session.claimed_at = timezone.now()
    session.status = FunnelSession.Status.CLAIMED
    session.save()
    return eligibility


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
    safety = eligibility.safety_screen or {}
    eligibility.safety_concern_flag = any(v is True for v in safety.values())

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
