"""
Photo storage for patient check-in photos (e.g., selfie on scale).

Local dev: writes to MEDIA_ROOT/checkin_photos/{user_id}/{uuid}.jpg
Production: uploads to S3 at the same key path.

PHI note: these images are associated with a patient UUID only — no name in the path.
"""
import logging
import uuid
from pathlib import Path

from django.conf import settings

logger = logging.getLogger(__name__)

_PHOTO_PREFIX = "checkin_photos"
_MAX_BYTES = 5 * 1024 * 1024  # 5 MB hard limit


def _make_key(user_id: str) -> str:
    return f"{_PHOTO_PREFIX}/{user_id}/{uuid.uuid4()}.jpg"


def save_checkin_photo(jpeg_bytes: bytes, *, user_id: str) -> str:
    """Persist JPEG bytes and return the storage key."""
    if len(jpeg_bytes) > _MAX_BYTES:
        raise ValueError(f"Photo exceeds {_MAX_BYTES // 1024 // 1024} MB limit.")
    key = _make_key(user_id)
    if getattr(settings, "USE_S3_STORAGE", False):
        _save_s3(key, jpeg_bytes)
    else:
        _save_local(key, jpeg_bytes)
    logger.info("[PHOTO_STORAGE] saved key=%s bytes=%d", key, len(jpeg_bytes))
    return key


def load_checkin_photo_bytes(key: str) -> bytes:
    """Load photo bytes from storage (for forwarding to Beluga as base64)."""
    if getattr(settings, "USE_S3_STORAGE", False):
        return _load_s3(key)
    return _load_local(key)


# --- S3 backend ---

def _save_s3(key: str, data: bytes) -> None:
    import boto3  # type: ignore[import]
    bucket = settings.AWS_STORAGE_BUCKET_NAME
    client = boto3.client(
        "s3",
        region_name=settings.AWS_S3_REGION_NAME,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )
    client.put_object(
        Bucket=bucket,
        Key=key,
        Body=data,
        ContentType="image/jpeg",
        ServerSideEncryption="AES256",
    )


def _load_s3(key: str) -> bytes:
    import boto3  # type: ignore[import]
    bucket = settings.AWS_STORAGE_BUCKET_NAME
    client = boto3.client(
        "s3",
        region_name=settings.AWS_S3_REGION_NAME,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )
    resp = client.get_object(Bucket=bucket, Key=key)
    return resp["Body"].read()


# --- Local filesystem backend ---

def _save_local(key: str, data: bytes) -> None:
    path = Path(settings.MEDIA_ROOT) / key
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def _load_local(key: str) -> bytes:
    path = Path(settings.MEDIA_ROOT) / key
    return path.read_bytes()
