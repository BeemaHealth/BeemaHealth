"""S3 access for patient uploads. Isolated so tests can patch it and no bytes pass through Django."""
from __future__ import annotations

from typing import Any

from django.conf import settings

ALLOWED_CONTENT_TYPES = frozenset({"image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"})
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
PRESIGN_SECONDS = 600


class StorageNotConfigured(Exception):
    """No upload bucket is configured."""


def _bucket() -> str:
    bucket = getattr(settings, "PHI_UPLOAD_BUCKET", "")
    if not bucket:
        raise StorageNotConfigured("Upload storage is not configured.")
    return bucket


def _client() -> Any:
    import boto3

    return boto3.client("s3", region_name=getattr(settings, "AWS_REGION", "us-east-1"))


def presign_upload(key: str, content_type: str) -> dict[str, Any]:
    """Presigned POST restricted to one key, one content type, and a size cap, encrypted at rest."""
    bucket = _bucket()
    return _client().generate_presigned_post(
        Bucket=bucket,
        Key=key,
        Fields={"Content-Type": content_type, "x-amz-server-side-encryption": "AES256"},
        Conditions=[
            {"Content-Type": content_type},
            {"x-amz-server-side-encryption": "AES256"},
            ["content-length-range", 1, MAX_UPLOAD_BYTES],
        ],
        ExpiresIn=PRESIGN_SECONDS,
    )


def object_size(key: str) -> int | None:
    """Size in bytes of an uploaded object, or ``None`` when it does not exist."""
    from botocore.exceptions import ClientError

    bucket = _bucket()
    try:
        return int(_client().head_object(Bucket=bucket, Key=key)["ContentLength"])
    except ClientError:
        return None
