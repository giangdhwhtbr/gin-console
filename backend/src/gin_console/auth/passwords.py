"""Generated passwords and their scrypt hashes (REQ-AUTH-010, REQ-AUTH-013)."""

from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import secrets

_N, _R, _P = 16384, 8, 1
_KEY_BYTES = 64
_SALT_BYTES = 16
PREFIX = f"scrypt${_N}${_R}${_P}$"


def generate() -> str:
    return secrets.token_urlsafe(18)


def _b64encode(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii").rstrip("=")


def _b64decode(text: str) -> bytes:
    return base64.b64decode(text + "=" * (-len(text) % 4), validate=True)


def _derive(password: str, salt: bytes) -> bytes:
    # surrogatepass: a lone surrogate, which JSON allows, is hashed rather than raising
    secret = password.encode("utf-8", "surrogatepass")
    return hashlib.scrypt(secret, salt=salt, n=_N, r=_R, p=_P, dklen=_KEY_BYTES)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(_SALT_BYTES)
    return PREFIX + _b64encode(salt) + "$" + _b64encode(_derive(password, salt))


def verify(password: str, encoded: str) -> bool:
    """True when `password` matches; False for a wrong password or any malformed hash.

    Only the parameters of PREFIX are accepted, so a hash cannot ask for a costlier scrypt.
    """
    if not encoded.startswith(PREFIX):
        return False
    parts = encoded.removeprefix(PREFIX).split("$")
    if len(parts) != 2:
        return False
    try:
        salt, expected = _b64decode(parts[0]), _b64decode(parts[1])
    except (binascii.Error, ValueError):
        return False
    if len(salt) != _SALT_BYTES or len(expected) != _KEY_BYTES:
        return False
    return hmac.compare_digest(_derive(password, salt), expected)


# Checked for unknown users so their answer takes as long as a wrong password (REQ-AUTH-003).
DUMMY_HASH: str = hash_password(secrets.token_urlsafe(18))
