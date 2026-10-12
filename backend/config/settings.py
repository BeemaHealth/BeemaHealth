"""Beema Health portal backend settings.

Secrets and environment-specific values come from the environment. No PHI in logs.
"""
from pathlib import Path

import dj_database_url
import environ
from django.core.exceptions import ImproperlyConfigured

from config.security import validate_production_settings

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(DEBUG=(bool, False))

DEBUG = env("DEBUG")
SECRET_KEY = env("SECRET_KEY")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=[])
# Load balancers between the internet and Django that append to X-Forwarded-For.
TRUSTED_PROXY_COUNT = env.int("TRUSTED_PROXY_COUNT", default=1)
# Requests larger than this are refused before parsing (webhooks have their own smaller cap).
REQUEST_BODY_MAX_BYTES = env.int("REQUEST_BODY_MAX_BYTES", default=2_000_000)

LOCAL_APPS = [
    "apps.common",
    "apps.accounts",
    "apps.patients",
    "apps.audit",
    "apps.catalog",
    "apps.questionnaires",
    "apps.clinical",
    "apps.routing",
    "apps.fulfillment",
    "apps.billing",
    "apps.messaging",
    "apps.integrations",
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "drf_spectacular",
    *LOCAL_APPS,
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "apps.common.middleware.RequestBodyLimitMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

DATABASES = {
    "default": dj_database_url.parse(
        env("DATABASE_URL"),
        conn_max_age=60,
        ssl_require=env.bool("DATABASE_SSL_REQUIRE", default=True),
    )
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 12}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.AnonRateThrottle", "rest_framework.throttling.UserRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {"anon": "30/min", "user": "300/min"},
    # Throttles key on the address our trusted proxy saw, never a client supplied X-Forwarded-For hop.
    "NUM_PROXIES": TRUSTED_PROXY_COUNT,
}

# Throttle counters must be shared across workers in production (set CACHE_URL, e.g. a Redis URL).
CACHES = {"default": env.cache("CACHE_URL", default="locmemcache://beema")}

CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

# Session and transport hardening (PHI behind the portal).
SESSION_COOKIE_AGE = 60 * 60 * 8
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=not DEBUG)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = 0 if DEBUG else 60 * 60 * 24 * 365
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# Vendor integrations. Secrets come from env (AWS Secrets Manager in production).
BELUGA_BASE_URL = env("BELUGA_BASE_URL", default="https://api-staging.belugahealth.com")
BELUGA_API_KEY = env("BELUGA_API_KEY", default="")
BELUGA_WEBHOOK_SECRET = env("BELUGA_WEBHOOK_SECRET", default="")
BELUGA_CHAT_PATH = env("BELUGA_CHAT_PATH", default="")
BELUGA_COMPANY = env("BELUGA_COMPANY", default="beemahealth")
BELUGA_VISIT_TYPE = env("BELUGA_VISIT_TYPE", default="weightloss")
BELUGA_PHARMACY_ID = env("BELUGA_PHARMACY_ID", default="")
BELUGA_RETRY_BACKOFF_SECONDS = env.float("BELUGA_RETRY_BACKOFF_SECONDS", default=0.5)

# Webhook pipeline
WEBHOOK_MAX_BODY_BYTES = env.int("WEBHOOK_MAX_BODY_BYTES", default=2 * 1024 * 1024)
INTEGRATIONS_MAX_ATTEMPTS = env.int("INTEGRATIONS_MAX_ATTEMPTS", default=8)
INTEGRATIONS_PROCESS_INLINE = env.bool("INTEGRATIONS_PROCESS_INLINE", default=False)
BELUGA_VISIT_PATH = env("BELUGA_VISIT_PATH", default="")

# Stripe (we own billing). Keys come from env, never the repo.
STRIPE_SECRET_KEY = env("STRIPE_SECRET_KEY", default="")
STRIPE_WEBHOOK_SECRET = env("STRIPE_WEBHOOK_SECRET", default="")

# Notifications (content free alerts only). Backends: console | twilio | ses
SMS_BACKEND = env("SMS_BACKEND", default="console")
TWILIO_ACCOUNT_SID = env("TWILIO_ACCOUNT_SID", default="")
TWILIO_AUTH_TOKEN = env("TWILIO_AUTH_TOKEN", default="")
TWILIO_FROM_NUMBER = env("TWILIO_FROM_NUMBER", default="")
EMAIL_NOTIFY_BACKEND = env("EMAIL_NOTIFY_BACKEND", default="console")
SES_FROM_EMAIL = env("SES_FROM_EMAIL", default="noreply@beemahealth.com")

# Transactional email (sign-in links and codes) goes through Django's mail framework.
# Dev prints the full message, link included, to the API log. Production sends over SMTP
# (SES SMTP credentials work) and refuses to boot without a host, so logins cannot silently fail.
EMAIL_BACKEND = env(
    "EMAIL_BACKEND",
    default="django.core.mail.backends.console.EmailBackend" if DEBUG else "django.core.mail.backends.smtp.EmailBackend",
)
EMAIL_HOST = env("EMAIL_HOST", default="")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_TIMEOUT = 10
if not DEBUG and EMAIL_BACKEND.endswith("smtp.EmailBackend") and not EMAIL_HOST:
    raise ImproperlyConfigured("EMAIL_HOST is required when DEBUG is false so sign-in emails can be delivered.")
AWS_REGION = env("AWS_REGION", default="us-east-1")
PORTAL_BASE_URL = env("PORTAL_BASE_URL", default="http://localhost:8081")

# Field level encryption key for PHI fields (Fernet). Required in production.
FIELD_ENCRYPTION_KEY = env("FIELD_ENCRYPTION_KEY", default="")

validate_production_settings(debug=DEBUG, secret_key=SECRET_KEY, field_encryption_key=FIELD_ENCRYPTION_KEY)

# Feature flags
BEEMA_PHARMACY_ROUTING_ENABLED = env.bool("BEEMA_PHARMACY_ROUTING_ENABLED", default=False)

# Dev only: in-process fake Beluga (no network). Refused unless DEBUG is true.
BELUGA_FAKE_MODE = env.bool("BELUGA_FAKE_MODE", default=False)
BELUGA_DEFAULT_QUANTITY = env("BELUGA_DEFAULT_QUANTITY", default="1")
BELUGA_DEFAULT_REFILLS = env("BELUGA_DEFAULT_REFILLS", default="0")

# LifeFile / MediVera pharmacy (used only when BEEMA_PHARMACY_ROUTING_ENABLED)
LIFEFILE_API_BASE_URL = env("LIFEFILE_API_BASE_URL", default="")
LIFEFILE_BASIC_AUTH_USER = env("LIFEFILE_BASIC_AUTH_USER", default="")
LIFEFILE_BASIC_AUTH_PASSWORD = env("LIFEFILE_BASIC_AUTH_PASSWORD", default="")
LIFEFILE_VENDOR_ID = env("LIFEFILE_VENDOR_ID", default="")
LIFEFILE_LOCATION_ID = env("LIFEFILE_LOCATION_ID", default="")
LIFEFILE_API_NETWORK_ID = env("LIFEFILE_API_NETWORK_ID", default="")
LIFEFILE_SHIPPING_SERVICE = env.int("LIFEFILE_SHIPPING_SERVICE", default=0)
LIFEFILE_HANDLING_SERVICE = env.int("LIFEFILE_HANDLING_SERVICE", default=0)
LIFEFILE_PRACTICE_ID = env.int("LIFEFILE_PRACTICE_ID", default=0)
LIFEFILE_WEBHOOK_USER = env("LIFEFILE_WEBHOOK_USER", default="")
LIFEFILE_WEBHOOK_PASSWORD = env("LIFEFILE_WEBHOOK_PASSWORD", default="")

# Private S3 bucket for ID photos, GLP-1 proof and chat attachments (BAA covered, SSE-KMS).
PHI_UPLOAD_BUCKET = env("PHI_UPLOAD_BUCKET", default="")

DEFINITIONS_DIR = BASE_DIR / "definitions"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}
