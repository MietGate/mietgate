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


def get_object_ranged(path: str, range_header: str = None):
    """Like get_object, but if range_header (e.g. 'bytes=0-1023') is given, only that
    byte range is requested from R2. Needed for large files like video, so the browser's
    metadata/seek probes don't force a full download of the whole object every time."""
    client = init_storage()
    kwargs = {"Bucket": R2_BUCKET_NAME, "Key": path}
    if range_header:
        kwargs["Range"] = range_header
    try:
        resp = client.get_object(**kwargs)
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code")
        if code in ("NoSuchKey", "404"):
            raise FileNotFoundError(path) from e
        raise
    content_range = resp.get("ContentRange")
    total_size = _parse_total(content_range) if content_range else resp.get("ContentLength")
    return {
        "data": resp["Body"].read(),
        "content_type": resp.get("ContentType") or guess_mime(path),
        "content_range": content_range,
        "total_size": total_size,
        "partial": bool(content_range),
    }


def _parse_total(content_range):
    if not content_range or "/" not in content_range:
        return None
    total = content_range.rsplit("/", 1)[-1]
    return int(total) if total.isdigit() else None


def guess_mime(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    return MIME_TYPES.get(ext, "application/octet-stream")
