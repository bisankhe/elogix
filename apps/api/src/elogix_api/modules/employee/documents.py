"""Uploading and serving employee documents.

Two things here are security decisions rather than plumbing, and both are the sort that
look like fussiness until the day they are not.

**Nothing user-supplied reaches a path.** The storage key is the content's SHA-256 under
the tenant's directory. The uploader's filename is recorded so the file can be served
back as itself and is never used to build a location, so `../../` in a filename is inert
rather than clever.

**Everything is served as an attachment, with sniffing off.** These files come from
whoever HR let upload one. An HTML file served inline from the API's origin is stored
XSS against every colleague who opens it, and a browser left to sniff will find HTML in
a file labelled anything at all. `Content-Disposition: attachment` plus
`X-Content-Type-Options: nosniff` costs nothing and removes the whole class.
"""

import re
import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from elogix_api.core.storage import Readable, StorageError, get_storage
from elogix_api.modules.employee.models import EmployeeDocument
from elogix_api.settings import get_settings

# What an HR system legitimately receives: scans, photographs and office documents.
# An allowlist rather than a blocklist — a blocklist is a list of the attacks someone
# thought of.
ALLOWED_CONTENT_TYPES = frozenset(
    {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
)

_UNSAFE_FILENAME = re.compile(r"[^A-Za-z0-9._-]")


def safe_filename(name: str | None, *, fallback: str) -> str:
    """A filename fit to put in a header.

    Not for building paths — nothing here builds a path from user input. This is so a
    header value cannot carry a newline, a quote or a directory separator into the
    response, and so the download arrives with a name a person recognises.
    """
    if not name:
        return fallback
    cleaned = _UNSAFE_FILENAME.sub("_", name.strip())[-120:].lstrip(".")
    return cleaned or fallback


def store_upload(
    db: Session,
    *,
    document: EmployeeDocument,
    upload: UploadFile,
    company_id: uuid.UUID,
) -> EmployeeDocument:
    """Attach a file to an existing document row.

    The row comes first and the file second, on purpose: a document is a record that HR
    keeps whether or not the paper has arrived, and "expected but not yet collected" is
    a state the expiry report needs to be able to show.
    """
    settings = get_settings()

    if upload.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"{upload.content_type or 'That file type'} is not accepted. "
            "Upload a PDF, an image, or a Word or Excel document.",
        )

    # `upload.size` is the multipart part's declared length. Checking it first refuses
    # an oversized file without reading it; the read loop below is what actually
    # enforces the limit, because a declared size is a claim.
    if upload.size is not None and upload.size > settings.max_upload_bytes:
        raise HTTPException(
            status.HTTP_413_CONTENT_TOO_LARGE,
            f"That file is larger than the {settings.max_upload_bytes // (1024 * 1024)} MB limit",
        )

    capped = _CappedReader(upload.file, limit=settings.max_upload_bytes)
    try:
        key, checksum, size = get_storage().put(company_id=company_id, source=capped)
    except _TooLarge as exc:
        raise HTTPException(
            status.HTTP_413_CONTENT_TOO_LARGE,
            f"That file is larger than the {settings.max_upload_bytes // (1024 * 1024)} MB limit",
        ) from exc
    except StorageError as exc:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, str(exc)) from exc

    if size == 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That file is empty")

    document.storage_key = key
    document.checksum = checksum
    document.size_bytes = size
    document.content_type = upload.content_type
    document.original_filename = safe_filename(upload.filename, fallback="document")

    db.commit()
    db.refresh(document)
    return document


def download(document: EmployeeDocument) -> StreamingResponse:
    """Stream the file back as an attachment, never inline."""
    if document.storage_key is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "No file has been uploaded for this document yet"
        )

    try:
        handle = get_storage().open(document.storage_key)
    except StorageError as exc:
        # The row says there is a file and the store disagrees. That is a real fault
        # worth surfacing as one, rather than a 404 that reads like "never uploaded".
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "The record points at a file that is missing from storage",
        ) from exc

    filename = safe_filename(document.original_filename, fallback="document")
    return StreamingResponse(
        handle,
        media_type=document.content_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
        },
    )


def verify(document: EmployeeDocument, *, is_verified: bool, verifier: str) -> None:
    """Set or clear the verified flag, always naming who did it."""
    document.is_verified = is_verified
    document.verified_by = verifier if is_verified else None
    document.verified_at = datetime.now(UTC) if is_verified else None


class _TooLarge(Exception):
    pass


class _CappedReader:
    """Refuses to yield more than `limit` bytes.

    The declared part size is a claim by the client. This is the enforcement: the
    storage backend streams through it, so an oversized upload stops at the limit
    instead of after it has been written to disk.
    """

    def __init__(self, source: Readable, limit: int) -> None:
        self._source = source
        self._limit = limit
        self._read = 0

    def read(self, size: int = -1, /) -> bytes:
        chunk = self._source.read(size)
        self._read += len(chunk)
        if self._read > self._limit:
            raise _TooLarge
        return chunk
