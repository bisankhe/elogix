"""
FILE: backend/utils/encryption.py
NepHR Pro -- shared encryption utility.

Closes a real gap: integration_api_routes.py (Integration & API
session) referenced this module for "encrypted at rest" API keys and
SMTP/SMS gateway credentials, but no encryption utility existed
anywhere in the build until now. Uses Fernet (symmetric, authenticated
encryption) from the cryptography library -- the standard choice for
this kind of at-rest secret storage.

The encryption key itself must come from an environment variable
(NEPHR_ENCRYPTION_KEY), never hard-coded or committed -- if it's
rotated, previously encrypted values become unreadable, so key
rotation must be paired with a re-encryption migration in production.
"""

import os
from cryptography.fernet import Fernet, InvalidToken

_KEY_ENV_VAR = "NEPHR_ENCRYPTION_KEY"


def _get_fernet() -> Fernet:
    key = os.environ.get(_KEY_ENV_VAR)
    if not key:
        raise RuntimeError(
            f"{_KEY_ENV_VAR} is not set. Generate one with "
            f"`python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"` "
            f"and set it as an environment variable before storing any credentials."
        )
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_value(plaintext: str) -> str:
    """Encrypts a plaintext secret (API key, SMTP password, etc.) for storage. Returns a string safe to store in a TEXT column."""
    if plaintext is None:
        return None
    fernet = _get_fernet()
    return fernet.encrypt(plaintext.encode()).decode()


def decrypt_value(ciphertext: str) -> str:
    """
    Decrypts a previously encrypted value. Raises ValueError if the
    ciphertext is invalid or was encrypted with a different key --
    callers should not silently swallow this, since a credential that
    fails to decrypt should never be used to authenticate a real request.
    """
    if ciphertext is None:
        return None
    fernet = _get_fernet()
    try:
        return fernet.decrypt(ciphertext.encode()).decode()
    except InvalidToken:
        raise ValueError("Unable to decrypt value -- it may have been encrypted with a different key, or is corrupted.")
