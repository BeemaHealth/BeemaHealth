from django.urls import path

from apps.accounts.views import (
    LoginMfaView,
    LoginView,
    LogoutView,
    MeView,
    RegisterView,
    ResendVerificationView,
    VerifyEmailView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("login/mfa/", LoginMfaView.as_view(), name="auth-login-mfa"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("verify-email/", VerifyEmailView.as_view(), name="auth-verify-email"),
    path("resend-verification/", ResendVerificationView.as_view(), name="auth-resend-verification"),
]
