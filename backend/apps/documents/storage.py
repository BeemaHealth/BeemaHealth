import uuid

from django.conf import settings

import boto3
from botocore.client import Config


def get_s3_client():
    return boto3.client(
        "s3",
        region_name=settings.AWS_S3_REGION_NAME,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
        config=Config(signature_version="s3v4"),
    )


def generate_presigned_upload(user_id: str, document_type: str, filename: str, content_type: str):
    if not settings.USE_S3_STORAGE:
        return {
            "upload_url": None,
            "file_key": f"local/{user_id}/{document_type}/{uuid.uuid4()}-{filename}",
            "method": "local",
        }
    file_key = f"patients/{user_id}/{document_type}/{uuid.uuid4()}-{filename}"
    client = get_s3_client()
    upload_url = client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
            "Key": file_key,
            "ContentType": content_type,
            "ServerSideEncryption": "aws:kms",
        },
        ExpiresIn=900,
    )
    return {"upload_url": upload_url, "file_key": file_key, "method": "s3"}
