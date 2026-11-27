import string

import pytest

from gin_console.auth.passwords import DUMMY_HASH, PREFIX, generate, hash_password, verify


# REQ-AUTH-013 (Mode and format): the hash format
def test_auth_013_hash_format() -> None:
    encoded = hash_password("secret")
    assert PREFIX == "scrypt$16384$8$1$"
    assert encoded.startswith(PREFIX)
    salt, key = encoded.removeprefix(PREFIX).split("$")
    assert "=" not in salt + key  # base64 without padding
    assert (len(salt), len(key)) == (22, 86)  # 16-byte salt, 64-byte key


# REQ-AUTH-013: each hash gets its own salt
def test_auth_013_salt_differs() -> None:
    assert hash_password("secret") != hash_password("secret")


# REQ-AUTH-002, REQ-AUTH-003
def test_auth_verify_round_trip_and_wrong_password() -> None:
    encoded = hash_password("secret")
    assert verify("secret", encoded)
    assert not verify("Secret", encoded)
    assert not verify("", encoded)


# REQ-AUTH-010: generated passwords
def test_auth_010_generate() -> None:
    first, second = generate(), generate()
    assert len(first) == 24
    assert set(first) <= set(string.ascii_letters + string.digits + "-_")
    assert first != second


# REQ-AUTH-003: a malformed hash never verifies
@pytest.mark.parametrize(
    "encoded",
    [
        "x",
        "",
        "scrypt$1$2",
        PREFIX + "!!!$!!!",
        PREFIX + "YWJj",
        PREFIX + "YWJj$YWJj$YWJj",
        "scrypt$1024$8$1$" + hash_password("secret").removeprefix(PREFIX),
        PREFIX + "é$é",
    ],
)
def test_auth_003_malformed_hash_is_false(encoded: str) -> None:
    assert not verify("secret", encoded)


# REQ-AUTH-003: the dummy hash checked for unknown users matches nothing typed
@pytest.mark.parametrize("typed", ["", "secret", "password", generate()])
def test_auth_003_dummy_hash_verifies_nothing(typed: str) -> None:
    assert DUMMY_HASH.startswith(PREFIX)
    assert not verify(typed, DUMMY_HASH)
