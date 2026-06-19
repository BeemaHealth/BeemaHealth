from django.urls import path

from apps.patients.views import (
    DashboardView,
    PatientProfileMeView,
    PatientSettingsMeView,
    PatientTwoFactorConfirmView,
    PatientTwoFactorSendCodeView,
)

urlpatterns = [
    path("me/", DashboardView.as_view(), name="dashboard-me"),
]

profile_urlpatterns = [
    path("me/", PatientProfileMeView.as_view(), name="patient-profile-me"),
]

settings_urlpatterns = [
    path("me/", PatientSettingsMeView.as_view(), name="patient-settings-me"),
    path(
        "me/two-factor/send-code/",
        PatientTwoFactorSendCodeView.as_view(),
        name="patient-settings-2fa-send",
    ),
    path(
        "me/two-factor/confirm/",
        PatientTwoFactorConfirmView.as_view(),
        name="patient-settings-2fa-confirm",
    ),
]
