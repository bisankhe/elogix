"""Where uploaded files actually live.

`EmployeeDocument.storage_key` has been an opaque string since phase 03 with nothing
behind it. This is the something.

**The key is not the permission.** A key is an opaque handle, and knowing one must never
be enough to read the file — every download resolves the key from a database row that
was already filtered by `company_id` (and, in self-service, by employee). Content
addressing makes keys stable and de-duplicating; it does not make them secret, and
nothing here relies on them being secret.

**Local disk is the default, not the ceiling.** `Storage` is a protocol precisely so an
S3 or MinIO implementation is a new class and a settings change rather than a rewrite.
The prototype used MinIO; standing that up is infrastructure this rebuild has not needed
yet, and a filesystem that works today beats an object store that is half-wired.
"""

import hashlib
import shutil
import uuid
from pathlib import Path
from typing import BinaryIO, Protocol


class StorageError(RuntimeError):
    """The file could not be stored or read back."""


class Readable(Protocol):
    """Anything that yields bytes.

    Narrower than `BinaryIO` because `put` calls exactly one method, and asking for the
    whole file interface would exclude the perfectly good wrappers callers put in front
    of an upload — the size-capping reader in `modules/employee/documents.py` being the
    one that exists.
    """

    def read(self, size: int = -1, /) -> bytes: ...


class Storage(Protocol):
    def put(self, *, company_id: uuid.UUID, source: Readable) -> tuple[str, str, int]:
        """Store a stream. Returns `(key, sha256, size_bytes)`."""
        ...

    def open(self, key: str) -> BinaryIO: ...

    def delete(self, key: str) -> None: ...

    def exists(self, key: str) -> bool: ...


class LocalStorage:
    """Files under a root directory, content-addressed and scoped by tenant.

    The key is `<company_id>/<sha256>`. The tenant prefix is not a security boundary —
    the query filter is — but it keeps one company's files in one subtree, which makes
    an export, a backup or a deletion request a directory operation instead of a scan.

    Content addressing means uploading the same file twice writes it once. That is a
    real case here: the same appointment-letter template lands on dozens of employee
    records.
    """

    def __init__(self, root: Path) -> None:
        self.root = root

    def _path(self, key: str) -> Path:
        # Resolve and re-check containment. `key` reaches this from a database column,
        # but a column is only ever as trustworthy as everything that has written to it,
        # and "../../etc/passwd" costs one line to refuse.
        candidate = (self.root / key).resolve()
        if not candidate.is_relative_to(self.root.resolve()):
            raise StorageError("Storage key escapes the storage root")
        return candidate

    def put(self, *, company_id: uuid.UUID, source: Readable) -> tuple[str, str, int]:
        digest = hashlib.sha256()
        size = 0

        # Written to a temporary name first and moved into place, so a failed or
        # truncated upload never leaves a file that looks complete under a key the
        # database is about to point at.
        staging = self.root / "incoming" / f"{uuid.uuid4().hex}.part"
        staging.parent.mkdir(parents=True, exist_ok=True)

        try:
            with staging.open("wb") as out:
                while chunk := source.read(1024 * 1024):
                    digest.update(chunk)
                    size += len(chunk)
                    out.write(chunk)

            key = f"{company_id}/{digest.hexdigest()}"
            destination = self._path(key)
            destination.parent.mkdir(parents=True, exist_ok=True)
            # Content-addressed, so an identical file is already the correct bytes.
            if destination.exists():
                staging.unlink()
            else:
                shutil.move(str(staging), destination)
        except OSError as exc:
            staging.unlink(missing_ok=True)
            raise StorageError(f"Could not store the file: {exc}") from exc
        except BaseException:
            # Anything else — the caller's reader refusing an oversized upload, most
            # likely. The partial file must still go: `incoming/` filling up with the
            # debris of rejected uploads is its own denial of service.
            staging.unlink(missing_ok=True)
            raise

        return key, digest.hexdigest(), size

    def open(self, key: str) -> BinaryIO:
        path = self._path(key)
        try:
            return path.open("rb")
        except OSError as exc:
            raise StorageError(f"Could not read the file: {exc}") from exc

    def delete(self, key: str) -> None:
        self._path(key).unlink(missing_ok=True)

    def exists(self, key: str) -> bool:
        return self._path(key).is_file()


_storage: Storage | None = None


def get_storage() -> Storage:
    """The process-wide storage backend, built once from settings."""
    global _storage
    if _storage is None:
        from elogix_api.settings import get_settings

        root = Path(get_settings().storage_dir)
        root.mkdir(parents=True, exist_ok=True)
        _storage = LocalStorage(root)
    return _storage


def set_storage(storage: Storage | None) -> None:
    """Swap the backend. For tests, and for whoever wires up S3."""
    global _storage
    _storage = storage
