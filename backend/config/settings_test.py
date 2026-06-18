"""Fast test settings — SQLite in memory, no external services."""

from config.settings import *  # noqa: F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
DEFAULT_THROTTLE_RATES = {
    "anon": "10000/minute",
    "user": "10000/minute",
    "auth": "10000/minute",
}
REST_FRAMEWORK = {
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_THROTTLE_RATES": DEFAULT_THROTTLE_RATES,
}
