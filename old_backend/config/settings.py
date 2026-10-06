import os
from pathlib import Path

import dj_database_url
import environ

BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent

BEEMAHEALTH_ENV = os.environ.get("BEEMAHEALTH_ENV", "dev")
_env_file = ROOT_DIR / f".env.{BEEMAHEALTH_ENV}"
if _env_file.is_file():
    environ.Env.read_env(_env_file)
environ.Env.read_env(ROOT_DIR / ".env")
environ.Env.read_env(BASE_DIR / ".env")

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
    CORS_ALLOWED_ORIGINS=(list, ["http://localhost:8080"]),
    CSRF_TRUSTED_ORIGINS=(list, []),
    REQUIRE_EMAIL_VERIFICATION=(bool, True),
)

SECRET_KEY = env("SECRET_KEY", default="dev-insecure-change-me-in-production")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")
REQUIRE_EMAIL_VERIFICATION = env("REQUIRE_EMAIL_VERIFICATION")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework.authtoken",
    "drf_spectacular",
    "apps.accounts",
    "apps.patients",
    "apps.eligibility",
    "apps.intakes",
    "apps.consents",
    "apps.documents",
    "apps.reviews",
    "apps.prescriptions",
    "apps.pharmacy",
    "apps.integrations",
    "apps.audit",
    "apps.common",
    "apps.analytics",
    "apps.questionnaires",
    "apps.staff",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.audit.middleware.AuditMiddleware",
]

ROOT_URLCONF = "config.urls"

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

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": dj_database_url.config(
        default=env(
            "DATABASE_URL",
            default="postgres://beemahealth:beemahealth@localhost:5432/beemahealth",
        ),
        conn_max_age=600,
        ssl_require=env.bool("DATABASE_SSL_REQUIRE", default=False),
    )
}

AUTH_USER_MODEL = "accounts.User"

AUTHENTICATION_BACKENDS = [
    "apps.accounts.backends.EmailBackend",
    "django.contrib.auth.backends.ModelBackend",
]

# Field-level encryption (generate for production: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
FERNET_KEYS = [
    env(
        "FERNET_KEY",
        default="dGhpcy1pcy1hLWRldi1rZXktMzJieXRlcyE=",
    )
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 10}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "America/Denver"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# CORS
CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")
CORS_ALLOW_CREDENTIALS = True

# CSRF — required for Django admin and session auth in dev (http://localhost:8000)
CSRF_TRUSTED_ORIGINS = env("CSRF_TRUSTED_ORIGINS") or [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]

if DEBUG:
    CSRF_COOKIE_SECURE = False
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SAMESITE = "Lax"

# DRF
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/minute",
        "user": "300/minute",
        "auth": "20/minute",
    },
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Beema Health API",
    "DESCRIPTION": "HIPAA-aligned telehealth intake API (prototype infrastructure in dev).",
    "VERSION": "1.0.0",
}

# AWS / S3 document storage
AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID", default="")
AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY", default="")
AWS_STORAGE_BUCKET_NAME = env("AWS_STORAGE_BUCKET_NAME", default="")
AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="us-west-2")
USE_S3_STORAGE = bool(AWS_STORAGE_BUCKET_NAME)

MEDIA_ROOT = BASE_DIR / "media"
MAX_DOCUMENT_UPLOAD_BYTES = env.int("MAX_DOCUMENT_UPLOAD_BYTES", default=20 * 1024 * 1024)

# Production security (enable when DEBUG=False)
if not DEBUG:
    SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Logging — never log PHI in request bodies
#
# Beluga flow trace (DEBUG only): the modules that build/send/receive Beluga
# data write a full-fidelity trace — including PHI, via dev_log() — to
# logs/beluga_flow.log so the whole initial-consult flow (payload build →
# snapshot freeze → outbound POST attempts → inbound webhooks → notifications
# → care timeline) can be replayed from one file. This handler is only wired
# up when DEBUG=True (local dev / docker-compose sets DEBUG=true); it never
# exists in staging/production, so PHI never reaches disk outside local dev.
BELUGA_FLOW_LOGGERS = (
    "apps.questionnaires.beluga_payload",
    "apps.consents.views",
    "apps.intakes.submissions",
    "apps.integrations.adapters.beluga_client",
    "apps.integrations.services",
    "apps.integrations.views",
    "apps.patients.notifications",
    "apps.patients.care_events",
    "apps.staff.views",
)

if DEBUG:
    LOGS_DIR = BASE_DIR / "logs"
    LOGS_DIR.mkdir(exist_ok=True)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "simple": {"format": "%(levelname)s %(name)s %(message)s"},
        "beluga_flow": {"format": "[%(asctime)s] %(levelname)s %(name)s: %(message)s"},
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
        **(
            {
                "beluga_flow_file": {
                    "class": "logging.FileHandler",
                    "filename": str(BASE_DIR / "logs" / "beluga_flow.log"),
                    "formatter": "beluga_flow",
                }
            }
            if DEBUG
            else {}
        ),
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django.request": {"level": "WARNING", "propagate": True},
        **(
            {
                name: {
                    "handlers": ["console", "beluga_flow_file"],
                    "level": "INFO",
                    "propagate": False,
                }
                for name in BELUGA_FLOW_LOGGERS
            }
            if DEBUG
            else {}
        ),
    },
}

# Hosting target documentation flag
HOSTING_TARGET = env("HOSTING_TARGET", default="local")  # local | heroku_shield | aws

# Email — console backend in dev prints verification links to Docker logs.
# Set EMAIL_BACKEND to django.core.mail.backends.smtp.EmailBackend for real delivery (e.g. Zoho).
EMAIL_BACKEND = env(
    "EMAIL_BACKEND",
    default="django.core.mail.backends.console.EmailBackend",
)
EMAIL_HOST = env("EMAIL_HOST", default="")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_USE_SSL = env.bool("EMAIL_USE_SSL", default=False)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@beemahealth")
FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:8080")

# SMS — console backend logs delivery in dev; set SMS_BACKEND=twilio with Twilio creds for production.
SMS_BACKEND = env("SMS_BACKEND", default="console")
TWILIO_ACCOUNT_SID = env("TWILIO_ACCOUNT_SID", default="")
TWILIO_AUTH_TOKEN = env("TWILIO_AUTH_TOKEN", default="")
TWILIO_FROM_NUMBER = env("TWILIO_FROM_NUMBER", default="")

# Patient portal intake editing (flip to True to allow broader post-submit edits).
INTAKE_PORTAL_EDITING_ENABLED = env.bool("INTAKE_PORTAL_EDITING_ENABLED", default=False)

# Partner integrations — defaults safe for local dev (mock adapters).
PHARMACY_ADAPTER = env("PHARMACY_ADAPTER", default="mock")
DYNAMIC_QUESTIONNAIRES = env.bool("DYNAMIC_QUESTIONNAIRES", default=True)
DOCTOR_WEBHOOK_SECRET = env("DOCTOR_WEBHOOK_SECRET", default="dev-doctor-webhook-secret")
BELUGA_WEBHOOK_SECRET = env("BELUGA_WEBHOOK_SECRET", default="dev-beluga-webhook-secret")
# Beluga outbound API
BELUGA_API_KEY = env("BELUGA_API_KEY", default="")
BELUGA_BASE_URL = env("BELUGA_BASE_URL", default="https://api-staging.belugahealth.com")
BELUGA_COMPANY = env("BELUGA_COMPANY", default="")
BELUGA_DEFAULT_PHARMACY_ID = env("BELUGA_DEFAULT_PHARMACY_ID", default="")
# Endpoint paths (trailing paths, appended to BELUGA_BASE_URL)
BELUGA_REFILL_ENDPOINT = env("BELUGA_REFILL_ENDPOINT", default="")
BELUGA_AUTORX_ENDPOINT = env("BELUGA_AUTORX_ENDPOINT", default="")
BELUGA_PHOTO_ENDPOINT = env("BELUGA_PHOTO_ENDPOINT", default="")
BELUGA_CREATION_PATH = env("BELUGA_CREATION_PATH", default="")
# Visit type strings per drug category (ask Beluga for actual values)
BELUGA_VISITTYPE_GLP1_CHECKIN = env("BELUGA_VISITTYPE_GLP1_CHECKIN", default="")
BELUGA_VISITTYPE_ED_CHECKIN = env("BELUGA_VISITTYPE_ED_CHECKIN", default="")
# Per-drug config (drives what check-in fields to collect)
BELUGA_DRUG_CONFIGS = {
    "glp1": {
        "visitType": BELUGA_VISITTYPE_GLP1_CHECKIN,
        "titrationField": True,
        "collectsWeight": True,
        "collectsPhoto": True,
        "collectsBMI": True,
        "collectsNotes": True,
    },
    "ed": {
        "visitType": BELUGA_VISITTYPE_ED_CHECKIN,
        "titrationField": True,
        "collectsWeight": False,
        "collectsPhoto": False,
        "collectsBMI": False,
        "collectsNotes": True,
    },
    "other": {
        "visitType": "",
        "titrationField": False,
        "collectsWeight": False,
        "collectsPhoto": False,
        "collectsBMI": False,
        "collectsNotes": True,
    },
}
LIFEFILE_WEBHOOK_USER = env("LIFEFILE_WEBHOOK_USER", default="lifefile_webhook")
LIFEFILE_WEBHOOK_PASSWORD = env("LIFEFILE_WEBHOOK_PASSWORD", default="dev-lifefile-webhook-pass")
LIFEFILE_API_BASE_URL = env("LIFEFILE_API_BASE_URL", default="")
LIFEFILE_BASIC_AUTH_USER = env("LIFEFILE_BASIC_AUTH_USER", default="")
LIFEFILE_BASIC_AUTH_PASSWORD = env("LIFEFILE_BASIC_AUTH_PASSWORD", default="")
LIFEFILE_VENDOR_ID = env.int("LIFEFILE_VENDOR_ID", default=0)
LIFEFILE_LOCATION_ID = env.int("LIFEFILE_LOCATION_ID", default=0)
LIFEFILE_API_NETWORK_ID = env.int("LIFEFILE_API_NETWORK_ID", default=0)
LIFEFILE_SHIPPING_SERVICE = env.int("LIFEFILE_SHIPPING_SERVICE", default=0)
LIFEFILE_HANDLING_SERVICE = env.int("LIFEFILE_HANDLING_SERVICE", default=0)
LIFEFILE_PRACTICE_ID = env.int("LIFEFILE_PRACTICE_ID", default=0)
