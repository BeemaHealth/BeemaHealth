from .settings import *  # noqa: F401,F403

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
SECURE_SSL_REDIRECT = False

# Tests build tables straight from models. Real migrations are generated once by the orchestrator.
MIGRATION_MODULES = {app.split(".")[-1]: None for app in LOCAL_APPS}
FIELD_ENCRYPTION_KEY = "u0N0ZxQ2m3g8m4j3Qy0r2tq1o9mV6o3Qw8nJrP8n2vA="
SECRET_KEY = "test-secret-key"
