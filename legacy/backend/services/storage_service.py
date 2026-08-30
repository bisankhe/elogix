"""
FILE: backend/services/storage_service.py
eLogix HRMS — File Storage Service
Supports: MinIO (Datahub VPS) | AWS S3 | Local disk (dev)
Per-tenant isolation: all files stored under tenant_{slug}/
eLogix Technologies · www.elogix.com.np
"""
import os, uuid, io
from pathlib import Path
from typing import Optional, BinaryIO
from flask import g
from ..utils.logging_config import get_logger

logger = get_logger("elogix.storage")

BACKEND        = os.getenv("STORAGE_BACKEND", "local")  # minio | s3 | local
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS   = os.getenv("MINIO_ACCESS_KEY", "")
MINIO_SECRET   = os.getenv("MINIO_SECRET_KEY", "")
MINIO_BUCKET   = os.getenv("MINIO_BUCKET", "elogix-hrms-files")
MINIO_SECURE   = os.getenv("MINIO_SECURE", "False").lower() == "true"
LOCAL_ROOT     = Path(os.getenv("LOCAL_STORAGE_PATH", "/tmp/elogix-uploads"))

ALLOWED_TYPES = {
    "cv":         [".pdf", ".doc", ".docx"],
    "payslip":    [".pdf"],
    "photo":      [".jpg", ".jpeg", ".png", ".webp"],
    "document":   [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".zip"],
    "attendance": [".xls", ".xlsx", ".csv"],
    "any":        [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png",
                   ".xls", ".xlsx", ".csv", ".zip", ".txt"],
}

MAX_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", 25))


class StorageService:
    """
    eLogix file storage — all operations are tenant-scoped.
    Key format: tenant_{slug}/{folder}/{uuid}{ext}
    Example:    tenant_himalayan/payslips/abc123def.pdf
    """

    # ── MinIO client ─────────────────────────────────────────
    @staticmethod
    def _minio():
        from minio import Minio
        client = Minio(
            MINIO_ENDPOINT,
            access_key=MINIO_ACCESS,
            secret_key=MINIO_SECRET,
            secure=MINIO_SECURE,
        )
        # Auto-create bucket if missing
        if not client.bucket_exists(MINIO_BUCKET):
            client.make_bucket(MINIO_BUCKET)
            logger.info(f"eLogix Storage: created bucket '{MINIO_BUCKET}'")
        return client

    # ── S3 client ────────────────────────────────────────────
    @staticmethod
    def _s3():
        import boto3
        return boto3.client("s3",
            aws_access_key_id     = os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY"),
            region_name           = os.getenv("AWS_REGION", "ap-south-1"),
        )

    # ── Tenant prefix ─────────────────────────────────────────
    @staticmethod
    def _tenant_prefix(tenant_slug: str = None) -> str:
        slug = tenant_slug or getattr(g, "tenant_id", "global")
        return f"tenant_{slug}"

    # ── Validate file ─────────────────────────────────────────
    @staticmethod
    def validate(filename: str, size_bytes: int, category: str = "any") -> tuple[bool, str]:
        ext = Path(filename).suffix.lower()
        allowed = ALLOWED_TYPES.get(category, ALLOWED_TYPES["any"])
        if ext not in allowed:
            return False, f"eLogix: file type '{ext}' not allowed. Allowed: {allowed}"
        if size_bytes > MAX_SIZE_MB * 1024 * 1024:
            return False, f"eLogix: file too large ({size_bytes//1024//1024}MB). Max: {MAX_SIZE_MB}MB"
        return True, ""

    # ── Upload ────────────────────────────────────────────────
    @classmethod
    def upload(cls,
               file_data:    bytes,
               filename:     str,
               folder:       str = "documents",
               tenant_slug:  str = None,
               category:     str = "any") -> dict:
        """
        Upload a file to eLogix storage.
        Returns: {key, url, filename, size_bytes, folder, tenant}
        """
        valid, err = cls.validate(filename, len(file_data), category)
        if not valid:
            raise ValueError(err)

        ext    = Path(filename).suffix.lower()
        prefix = cls._tenant_prefix(tenant_slug)
        key    = f"{prefix}/{folder}/{uuid.uuid4().hex}{ext}"
        size   = len(file_data)

        if BACKEND == "minio":
            client = cls._minio()
            client.put_object(
                MINIO_BUCKET, key,
                data=io.BytesIO(file_data),
                length=size,
                content_type=cls._content_type(ext),
            )
            logger.info(f"eLogix Storage [MinIO]: uploaded {key} ({size} bytes)")

        elif BACKEND == "s3":
            cls._s3().put_object(
                Bucket=MINIO_BUCKET, Key=key,
                Body=file_data,
                ContentType=cls._content_type(ext),
            )
            logger.info(f"eLogix Storage [S3]: uploaded {key} ({size} bytes)")

        else:  # local
            path = LOCAL_ROOT / key
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(file_data)
            logger.info(f"eLogix Storage [local]: saved {path}")

        return {
            "key":        key,
            "url":        cls.get_url(key),
            "filename":   filename,
            "size_bytes": size,
            "folder":     folder,
            "tenant":     prefix,
            "backend":    BACKEND,
        }

    # ── Download ──────────────────────────────────────────────
    @classmethod
    def download(cls, key: str) -> bytes:
        """Download file bytes from eLogix storage."""
        if BACKEND == "minio":
            response = cls._minio().get_object(MINIO_BUCKET, key)
            return response.read()
        elif BACKEND == "s3":
            obj = cls._s3().get_object(Bucket=MINIO_BUCKET, Key=key)
            return obj["Body"].read()
        else:
            path = LOCAL_ROOT / key
            if not path.exists():
                raise FileNotFoundError(f"eLogix Storage: file not found — {key}")
            return path.read_bytes()

    # ── Signed URL ────────────────────────────────────────────
    @classmethod
    def get_url(cls, key: str, expires: int = 3600) -> str:
        """Get a pre-signed URL (MinIO/S3) or local API path."""
        if BACKEND == "minio":
            from datetime import timedelta
            return cls._minio().presigned_get_object(
                MINIO_BUCKET, key, expires=timedelta(seconds=expires)
            )
        elif BACKEND == "s3":
            return cls._s3().generate_presigned_url(
                "get_object",
                Params={"Bucket": MINIO_BUCKET, "Key": key},
                ExpiresIn=expires,
            )
        else:
            return f"/api/v1/files/{key}"

    # ── Delete ────────────────────────────────────────────────
    @classmethod
    def delete(cls, key: str):
        """Permanently delete a file from eLogix storage."""
        if BACKEND == "minio":
            cls._minio().remove_object(MINIO_BUCKET, key)
        elif BACKEND == "s3":
            cls._s3().delete_object(Bucket=MINIO_BUCKET, Key=key)
        else:
            path = LOCAL_ROOT / key
            if path.exists():
                path.unlink()
        logger.info(f"eLogix Storage: deleted {key}")

    # ── List tenant files ─────────────────────────────────────
    @classmethod
    def list_tenant_files(cls, tenant_slug: str, folder: str = None) -> list:
        """List all files for an eLogix tenant."""
        prefix = cls._tenant_prefix(tenant_slug)
        if folder:
            prefix = f"{prefix}/{folder}/"

        if BACKEND == "minio":
            objects = cls._minio().list_objects(MINIO_BUCKET, prefix=prefix, recursive=True)
            return [{"key": obj.object_name, "size": obj.size, "modified": str(obj.last_modified)}
                    for obj in objects]
        elif BACKEND == "s3":
            resp = cls._s3().list_objects_v2(Bucket=MINIO_BUCKET, Prefix=prefix)
            return [{"key": o["Key"], "size": o["Size"], "modified": str(o["LastModified"])}
                    for o in resp.get("Contents", [])]
        else:
            root = LOCAL_ROOT / prefix
            if not root.exists():
                return []
            return [{"key": str(f.relative_to(LOCAL_ROOT)), "size": f.stat().st_size}
                    for f in root.rglob("*") if f.is_file()]

    # ── Tenant storage stats ──────────────────────────────────
    @classmethod
    def tenant_storage_usage(cls, tenant_slug: str) -> dict:
        files = cls.list_tenant_files(tenant_slug)
        total_bytes = sum(f.get("size", 0) for f in files)
        return {
            "tenant":        tenant_slug,
            "file_count":    len(files),
            "total_bytes":   total_bytes,
            "total_mb":      round(total_bytes / 1024 / 1024, 2),
            "total_gb":      round(total_bytes / 1024 / 1024 / 1024, 4),
        }

    # ── Ensure tenant prefix exists ───────────────────────────
    @classmethod
    def ensure_tenant_prefix(cls, tenant_slug: str):
        """Called during tenant provisioning to set up storage."""
        prefix = cls._tenant_prefix(tenant_slug)
        folders = ["documents", "payslips", "photos", "cv", "attendance", "letters", "exports"]
        if BACKEND == "minio":
            client = cls._minio()
            for folder in folders:
                placeholder_key = f"{prefix}/{folder}/.elogix_keep"
                client.put_object(
                    MINIO_BUCKET, placeholder_key,
                    data=io.BytesIO(b"eLogix storage placeholder"),
                    length=26,
                )
        elif BACKEND == "local":
            for folder in folders:
                (LOCAL_ROOT / prefix / folder).mkdir(parents=True, exist_ok=True)
        logger.info(f"eLogix Storage: tenant '{tenant_slug}' folders created: {folders}")

    # ── Content type helper ───────────────────────────────────
    @staticmethod
    def _content_type(ext: str) -> str:
        types = {
            ".pdf": "application/pdf",
            ".doc": "application/msword",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xls":  "application/vnd.ms-excel",
            ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".csv":  "text/csv",
            ".jpg":  "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png":  "image/png",
            ".zip":  "application/zip",
        }
        return types.get(ext.lower(), "application/octet-stream")
