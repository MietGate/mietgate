import os
import boto3
from botocore.exceptions import ClientError

APP_NAME = "mietgate"

R2_ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID")
R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME", "mietgate-uploads")
R2_JURISDICTION = os.environ.get("R2_JURISDICTION", "eu")

MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp", "pdf": "application/pdf",
    "json": "application/json", "csv": "text/csv", "txt": "text/plain",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

_client = None


def init_storage():
    global _client
    if _client is not None:
        return _client
    jurisdiction_prefix = f"{R2_JURISDICTION}." if R2_JURISDICTION else ""
    _client = boto3.client(
        "s3",
        endpoint_url=f"https://{R2_ACCOUNT_ID}.{jurisdiction_prefix}r2.cloudflarestorage.com",
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        region_name="auto",
    )
    return _client


def put_object(path: str, data: bytes, content_type: str) -> dict:
    client = init_storage()
    client.put_object(Bucket=R2_BUCKET_NAME, Key=path, Body=data, ContentType=content_type)
    return {"path": path, "size": len(data)}


def get_object(path: str):
    client = init_storage()
    try:
        resp = client.get_object(Bucket=R2_BUCKET_NAME, Key=path)
    except ClientError as e:
        if e.response.get("Error", {}).get("Code") in ("NoSuchKey", "404"):
            raise FileNotFoundError(path) from e
        raise
    return resp["Body"].read(), resp.get("ContentType") or guess_mime(path)


def guess_mime(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    return MIME_TYPES.get(ext, "application/octet-stream")
