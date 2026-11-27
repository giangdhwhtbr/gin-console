"""Sign-in, the session middleware and session end over the API (REQ-AUTH-001 to 006, 009)."""

import logging
import os
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any, Literal

import pytest
import yaml
from fake_bd import FakeBd
from fake_export import bead, write_export
from fastapi.testclient import TestClient
from httpx import Response

from gin_console.app import create_app
from gin_console.auth import router as auth_router
from gin_console.auth.access import COOKIE
from gin_console.auth.passwords import DUMMY_HASH, hash_password, verify
from gin_console.auth.users import User, save_users
from gin_console.config import AuthSettings, ProjectEntry, RateLimitSettings, Settings

START = datetime(2026, 11, 27, 9, 0, tzinfo=UTC)
PASSWORDS = {"an": "pw-an", "root": "pw-root"}
HASHES = {name: hash_password(password) for name, password in PASSWORDS.items()}
INVALID = {"error": "invalid username or password"}
REQUIRED = {"error": "sign-in required"}
LOCKED = {"error": "too many attempts"}


class Clock:
    def __init__(self) -> None:
        self.now = START

    def __call__(self) -> datetime:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += timedelta(seconds=seconds)


def user(name: str, projects: list[str] | Literal["*"], password_hash: str | None = None) -> User:
    return User(
        name=name,
        email=f"{name}@x.io",
        password_hash=password_hash or HASHES[name],
        projects=projects,
    )


def write_users(path: Path, users: list[User]) -> None:
    """Rewrite the users file as the CLI does, and move its mtime forward."""
    before = path.stat().st_mtime_ns if path.exists() else 0
    save_users(path, users)
    later = max(path.stat().st_mtime_ns, before + 1_000_000)
    os.utime(path, ns=(later, later))


def auth_app(
    tmp_path: Path,
    users: list[User] | None = None,
    clock: Callable[[], datetime] | None = None,
    enabled: bool = True,
    **kwargs: Any,
) -> TestClient:
    """Projects `a` and `b` (each with one bead) and the users file `users.yaml`, by default
    `an` with `[a]` and `root` with every project."""
    for name in ("a", "b"):
        write_export(tmp_path / name, [bead(f"{name}-1")])
    dist = tmp_path / "dist"
    dist.mkdir(exist_ok=True)
    (dist / "index.html").write_text("<html>console</html>")
    users_file = tmp_path / "users.yaml"
    write_users(users_file, users if users is not None else [user("an", ["a"]), user("root", "*")])
    settings = Settings(
        projects=[ProjectEntry(name=n, path=tmp_path / n) for n in ("a", "b")],
        auth=AuthSettings(enabled=enabled, users_file=users_file),
    )
    kwargs.setdefault("run_bd", FakeBd())
    app = create_app(
        settings, static_dir=dist, clock=clock or Clock(), schedule_pulls=False, **kwargs
    )
    return TestClient(app)


def sign_in(client: TestClient, name: str, password: str | None = None) -> Response:
    res: Response = client.post(
        "/api/auth/login", json={"username": name, "password": password or PASSWORDS[name]}
    )
    return res


def cookie_attributes(res: Response) -> dict[str, str]:
    """The attributes of the session cookie set by `res`, keys lower-cased."""
    header = res.headers["set-cookie"]
    first, *rest = (part.strip() for part in header.split(";"))
    name, _, value = first.partition("=")
    assert name == COOKIE
    attributes = {"value": value}
    for part in rest:
        key, _, val = part.partition("=")
        attributes[key.lower()] = val
    return attributes


# REQ-AUTH-001: No auth section
def test_auth_001_no_auth_section(tmp_path: Path) -> None:
    for name in ("a", "b"):
        (tmp_path / name).mkdir()
    settings = Settings(projects=[ProjectEntry(name=n, path=tmp_path / n) for n in ("a", "b")])
    client = TestClient(create_app(settings, run_bd=FakeBd(), schedule_pulls=False))
    res = client.get("/api/projects/beads")
    assert res.status_code == 200
    assert [p["name"] for p in res.json()] == ["a", "b"]
    assert "set-cookie" not in res.headers


# REQ-AUTH-001: Me while off
def test_auth_001_me_while_off(tmp_path: Path) -> None:
    client = auth_app(tmp_path, enabled=False)
    res = client.get("/api/auth/me")
    assert res.status_code == 200
    assert res.json() == {"enabled": False, "user": None}


# REQ-AUTH-001: Login while off
def test_auth_001_login_while_off(tmp_path: Path) -> None:
    client = auth_app(tmp_path, enabled=False)
    res = sign_in(client, "an")
    assert res.status_code == 404
    assert "set-cookie" not in res.headers
    # with auth off a cookie changes nothing
    client.cookies.set(COOKIE, "anything")
    assert client.get("/api/overview").status_code == 200


# REQ-AUTH-002: Right password
def test_auth_002_right_password(tmp_path: Path) -> None:
    res = sign_in(auth_app(tmp_path), "an")
    assert res.status_code == 200
    body = res.json()
    assert (body["name"], body["email"], body["projects"]) == ("an", "an@x.io", ["a"])
    cookie = cookie_attributes(res)
    assert len(cookie["value"]) >= 43  # 32 random bytes, URL-safe base64
    assert "httponly" in cookie
    assert cookie["samesite"].lower() == "strict"
    assert cookie["path"] == "/"
    assert cookie["max-age"] == "43200"
    assert "secure" not in cookie
    assert body["mockup_grant"] != cookie["value"] and len(body["mockup_grant"]) >= 43


# REQ-AUTH-002: Secure on https, and Max-Age follows the TTL
def test_auth_002_secure_on_https(tmp_path: Path) -> None:
    users_file = tmp_path / "users.yaml"
    write_users(users_file, [user("an", ["a"])])
    (tmp_path / "a").mkdir()
    settings = Settings(
        projects=[ProjectEntry(name="a", path=tmp_path / "a")],
        auth=AuthSettings.model_validate(
            {"enabled": True, "users_file": users_file, "session_ttl": "30m"}
        ),
    )
    app = create_app(settings, run_bd=FakeBd(), schedule_pulls=False)
    res = sign_in(TestClient(app, base_url="https://testserver"), "an")
    cookie = cookie_attributes(res)
    assert "secure" in cookie and cookie["max-age"] == "1800"


# REQ-AUTH-002: Me after sign-in
def test_auth_002_me_after_sign_in(tmp_path: Path) -> None:
    client = auth_app(tmp_path)
    grant = sign_in(client, "an").json()["mockup_grant"]
    res = client.get("/api/auth/me")
    assert res.status_code == 200
    assert res.json() == {
        "enabled": True,
        "user": {"name": "an", "email": "an@x.io", "projects": ["a"], "mockup_grant": grant},
    }


# REQ-AUTH-002: Me before sign-in
def test_auth_002_me_before_sign_in(tmp_path: Path) -> None:
    res = auth_app(tmp_path).get("/api/auth/me")
    assert res.status_code == 200
    assert res.json() == {"enabled": True, "user": None}


# REQ-AUTH-002: Username case
def test_auth_002_username_case(tmp_path: Path) -> None:
    client = auth_app(tmp_path)
    res = sign_in(client, "An", PASSWORDS["an"])
    assert res.status_code == 200 and res.json()["name"] == "an"
    assert client.get("/api/overview").status_code == 200


# REQ-AUTH-002: a user with every project gets them in config order
def test_auth_002_all_projects(tmp_path: Path) -> None:
    assert sign_in(auth_app(tmp_path), "root").json()["projects"] == ["a", "b"]


class Verifies:
    """Records the hash each sign-in is checked against, then checks it."""

    def __init__(self) -> None:
        self.hashes: list[str] = []

    def __call__(self, password: str, encoded: str) -> bool:
        self.hashes.append(encoded)
        return verify(password, encoded)


@pytest.fixture
def verifies(monkeypatch: pytest.MonkeyPatch) -> Verifies:
    recorder = Verifies()
    monkeypatch.setattr(auth_router, "verify", recorder)
    return recorder


# REQ-AUTH-003: Wrong password
def test_auth_003_wrong_password(tmp_path: Path, verifies: Verifies) -> None:
    res = sign_in(auth_app(tmp_path), "an", "wrong")
    assert res.status_code == 401 and res.json() == INVALID
    assert "set-cookie" not in res.headers
    assert verifies.hashes == [HASHES["an"]]


# REQ-AUTH-003: Unknown user
def test_auth_003_unknown_user(tmp_path: Path, verifies: Verifies) -> None:
    res = sign_in(auth_app(tmp_path), "bo", "anything")
    assert res.status_code == 401 and res.json() == INVALID
    assert "set-cookie" not in res.headers
    assert verifies.hashes == [DUMMY_HASH]


# REQ-AUTH-003: Malformed body
@pytest.mark.parametrize(
    "content",
    [
        b'{"username": "an"}',
        b'{"password": "pw-an"}',
        b'{"username": "an", "password": 1}',
        b'{"username": ["an"], "password": "pw-an"}',
        b'["an", "pw-an"]',
        b"not json",
        b"",
        b"\xff\xfe",
    ],
)
def test_auth_003_malformed_body(tmp_path: Path, content: bytes) -> None:
    res = auth_app(tmp_path).post(
        "/api/auth/login", content=content, headers={"content-type": "application/json"}
    )
    assert res.status_code == 401 and res.json() == INVALID
    assert "set-cookie" not in res.headers


# REQ-AUTH-003: a password JSON allows but UTF-8 does not (a lone surrogate) is just wrong
def test_auth_003_lone_surrogate(tmp_path: Path) -> None:
    client = auth_app(tmp_path)
    for body in (
        b'{"username": "an", "password": "\\ud800"}',
        b'{"username": "\\ud800", "password": "\\ud800"}',
    ):
        res = client.post(
            "/api/auth/login", content=body, headers={"content-type": "application/json"}
        )
        assert res.status_code == 401 and res.json() == INVALID


# REQ-AUTH-003: the password is never logged
def test_auth_003_password_not_logged(tmp_path: Path, caplog: pytest.LogCaptureFixture) -> None:
    caplog.set_level(logging.DEBUG)
    client = auth_app(tmp_path)
    sign_in(client, "an", "secret-typed-password")
    token = cookie_attributes(sign_in(client, "an"))["value"]
    assert "secret-typed-password" not in caplog.text
    assert PASSWORDS["an"] not in caplog.text
    assert token not in caplog.text


# REQ-AUTH-003: a failure is counted even when the check itself fails
def test_auth_003_failed_check_is_counted(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    def broken(password: str, encoded: str) -> bool:
        raise MemoryError("scrypt")

    client = TestClient(auth_app(tmp_path).app, raise_server_exceptions=False)
    monkeypatch.setattr(auth_router, "verify", broken)
    for _ in range(5):
        assert sign_in(client, "an").status_code == 500
    monkeypatch.setattr(auth_router, "verify", verify)
    assert sign_in(client, "an").status_code == 429


# REQ-AUTH-004: Username locked
def test_auth_004_username_locked(tmp_path: Path, verifies: Verifies) -> None:
    clock = Clock()
    client = auth_app(tmp_path, clock=clock)
    for _ in range(5):
        assert sign_in(client, "an", "wrong").status_code == 401
    clock.advance(100)
    checked = len(verifies.hashes)
    res = sign_in(client, "AN", PASSWORDS["an"])
    assert res.status_code == 429 and res.json() == LOCKED
    assert res.headers["retry-after"] == "800"
    assert "set-cookie" not in res.headers
    assert len(verifies.hashes) == checked  # the password was not checked
    # a refusal is not counted: the lock still ends with the first failure
    clock.advance(799)
    assert sign_in(client, "an").headers["retry-after"] == "1"
    # another user from the same IP is not locked
    assert sign_in(client, "root").status_code == 200


# REQ-AUTH-004: IP locked
def test_auth_004_ip_locked(tmp_path: Path) -> None:
    client = auth_app(tmp_path)
    for n in range(20):
        assert sign_in(client, f"user-{n % 5}", "wrong").status_code == 401
    for name in ("an", "root", "nobody"):
        res = sign_in(client, name, "any")
        assert res.status_code == 429 and res.json() == LOCKED
        assert int(res.headers["retry-after"]) == 900


# REQ-AUTH-004: Window passes
def test_auth_004_window_passes(tmp_path: Path) -> None:
    clock = Clock()
    client = auth_app(tmp_path, clock=clock)
    for _ in range(5):
        sign_in(client, "an", "wrong")
    assert sign_in(client, "an").status_code == 429
    clock.advance(900)
    assert sign_in(client, "an").status_code == 200


# REQ-AUTH-004: Success resets the user
def test_auth_004_success_resets_the_user(tmp_path: Path, verifies: Verifies) -> None:
    client = auth_app(tmp_path)
    for _ in range(4):
        sign_in(client, "an", "wrong")
    assert sign_in(client, "an").status_code == 200
    for _ in range(4):
        assert sign_in(client, "an", "wrong").status_code == 401
    checked = len(verifies.hashes)
    assert sign_in(client, "an", "wrong").status_code == 401
    assert len(verifies.hashes) == checked + 1


# REQ-AUTH-004: a success clears the username's failures, not the IP's
def test_auth_004_success_keeps_the_ip_failures(tmp_path: Path) -> None:
    clock = Clock()
    users = [user("an", ["a"]), user("root", "*")]
    for name in ("a", "b"):
        (tmp_path / name).mkdir()
    users_file = tmp_path / "users.yaml"
    write_users(users_file, users)
    settings = Settings(
        projects=[ProjectEntry(name=n, path=tmp_path / n) for n in ("a", "b")],
        auth=AuthSettings(
            enabled=True, users_file=users_file, rate_limit=RateLimitSettings(per_ip=3)
        ),
    )
    client = TestClient(create_app(settings, clock=clock, run_bd=FakeBd(), schedule_pulls=False))
    sign_in(client, "an", "wrong")
    sign_in(client, "root", "wrong")
    assert sign_in(client, "an").status_code == 200
    sign_in(client, "nobody", "wrong")
    assert sign_in(client, "root").status_code == 429


# REQ-AUTH-005: No cookie
@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", "/api/overview"),
        ("GET", "/api/projects/beads"),
        ("GET", "/api/beads?project=a"),
        ("POST", "/api/refresh"),
        ("GET", "/api/nothing/here"),
        ("GET", "/api"),
        ("POST", "/api/auth/me"),
        ("GET", "/api/auth/login"),
        ("HEAD", "/api/health"),
        ("GET", "/api/requirements/mockups/a/files/ui/2026-11-22/style.css"),
    ],
)
def test_auth_005_no_cookie(tmp_path: Path, method: str, path: str) -> None:
    bd = FakeBd()
    res = auth_app(tmp_path, run_bd=bd).request(method, path)
    assert res.status_code == 401 and (method == "HEAD" or res.json() == REQUIRED)
    assert bd.calls == []


# REQ-AUTH-005: Open routes
def test_auth_005_open_routes(tmp_path: Path) -> None:
    client = auth_app(tmp_path)
    assert client.get("/api/health").status_code == 200
    assert client.get("/api/auth/me").status_code == 200
    assert sign_in(client, "an", "wrong").status_code == 401  # reached the login route


# REQ-AUTH-005: Frontend served
@pytest.mark.parametrize("path", ["/", "/beads", "/apix"])
def test_auth_005_frontend_served(tmp_path: Path, path: str) -> None:
    res = auth_app(tmp_path).get(path)
    assert res.status_code == 200 and res.text == "<html>console</html>"


# REQ-AUTH-005: Forged token
@pytest.mark.parametrize("value", ["forged", "", "x" * 43])
def test_auth_005_forged_token(tmp_path: Path, value: str) -> None:
    client = auth_app(tmp_path)
    client.cookies.set(COOKIE, value)
    res = client.get("/api/overview")
    assert res.status_code == 401 and res.json() == REQUIRED


# REQ-AUTH-005: the cross-site refusal runs before the session check
def test_auth_005_cross_site_first(tmp_path: Path) -> None:
    res = auth_app(tmp_path).get("/api/overview", headers={"sec-fetch-site": "cross-site"})
    assert res.status_code == 403 and res.json() == {"error": "cross-site request refused"}


# REQ-AUTH-005: a signed-in client reaches the API, and its answers are still compressed
def test_auth_005_signed_in(tmp_path: Path) -> None:
    client = auth_app(tmp_path)
    sign_in(client, "an")
    res = client.get("/api/beads?project=a", headers={"accept-encoding": "gzip"})
    assert res.status_code == 200 and [b["id"] for b in res.json()] == ["a-1"]
    write_export(tmp_path / "a", [bead(f"a-{n}", description="x" * 100) for n in range(20)])
    res = client.get("/api/beads?project=a", headers={"accept-encoding": "gzip"})
    assert res.headers["content-encoding"] == "gzip"


# REQ-AUTH-006: Expired
def test_auth_006_expired(tmp_path: Path) -> None:
    clock = Clock()
    client = auth_app(tmp_path, clock=clock)
    sign_in(client, "an")
    clock.advance(12 * 3600 - 1)
    assert client.get("/api/overview").status_code == 200
    clock.advance(1)
    res = client.get("/api/overview")
    assert res.status_code == 401 and res.json() == REQUIRED
    assert client.get("/api/auth/me").json() == {"enabled": True, "user": None}


# REQ-AUTH-006: Sign out
def test_auth_006_sign_out(tmp_path: Path) -> None:
    client = auth_app(tmp_path)
    token = cookie_attributes(sign_in(client, "an"))["value"]
    res = client.post("/api/auth/logout")
    assert res.status_code == 204 and res.content == b""
    cleared = cookie_attributes(res)
    assert cleared["value"] in ("", '""') and cleared["max-age"] == "0"
    client.cookies.set(COOKIE, token)
    res = client.get("/api/overview")
    assert res.status_code == 401 and res.json() == REQUIRED


# REQ-AUTH-006: logout answers 204 without a valid session too
@pytest.mark.parametrize("value", [None, "forged"])
def test_auth_006_sign_out_without_session(tmp_path: Path, value: str | None) -> None:
    client = auth_app(tmp_path)
    if value is not None:
        client.cookies.set(COOKIE, value)
    res = client.post("/api/auth/logout")
    assert res.status_code == 204
    assert cookie_attributes(res)["max-age"] == "0"


# REQ-AUTH-006: signing out ends only that session
def test_auth_006_sign_out_one_session(tmp_path: Path) -> None:
    first = auth_app(tmp_path)
    second = TestClient(first.app)
    sign_in(first, "an")
    sign_in(second, "an")
    first.post("/api/auth/logout")
    assert second.get("/api/overview").status_code == 200


# REQ-AUTH-009: Password reset
def test_auth_009_password_reset(tmp_path: Path) -> None:
    client = auth_app(tmp_path)
    other = TestClient(client.app)
    sign_in(client, "an")
    sign_in(other, "root")
    write_users(
        tmp_path / "users.yaml", [user("an", ["a"], hash_password("new")), user("root", "*")]
    )
    res = client.get("/api/overview")
    assert res.status_code == 401 and res.json() == REQUIRED
    assert other.get("/api/overview").status_code == 200  # other users stay signed in
    assert sign_in(client, "an").status_code == 401
    assert sign_in(client, "an", "new").status_code == 200


# REQ-AUTH-009: a removed user is signed out
def test_auth_009_user_removed(tmp_path: Path) -> None:
    client = auth_app(tmp_path)
    sign_in(client, "an")
    write_users(tmp_path / "users.yaml", [user("root", "*")])
    assert client.get("/api/overview").status_code == 401
    assert sign_in(client, "an").status_code == 401


# REQ-AUTH-009: Project unassigned
def test_auth_009_project_unassigned(tmp_path: Path) -> None:
    client = auth_app(tmp_path, users=[user("an", ["a", "b"])])
    sign_in(client, "an")
    assert client.get("/api/beads?project=b").status_code == 200
    moved = user("an", ["a"]).model_copy(update={"email": "new@x.io"})
    write_users(tmp_path / "users.yaml", [moved])
    assert client.get("/api/beads?project=b").status_code == 404
    me = client.get("/api/auth/me").json()["user"]
    assert (me["email"], me["projects"]) == ("new@x.io", ["a"])


# REQ-AUTH-009: Broken file
def test_auth_009_broken_file(tmp_path: Path, caplog: pytest.LogCaptureFixture) -> None:
    client = auth_app(tmp_path)
    sign_in(client, "an")
    users_file = tmp_path / "users.yaml"
    before = users_file.stat().st_mtime_ns
    users_file.write_text("users: [\n")
    os.utime(users_file, ns=(before + 1_000_000, before + 1_000_000))
    with caplog.at_level(logging.ERROR, logger="gin_console.auth"):
        assert client.get("/api/overview").status_code == 200
        assert client.get("/api/beads?project=a").status_code == 200
        assert client.get("/api/beads?project=b").status_code == 404
    errors = [r for r in caplog.records if r.levelno == logging.ERROR]
    assert len(errors) == 1 and str(users_file) in errors[0].getMessage()
    assert sign_in(TestClient(client.app), "root").status_code == 200


# REQ-AUTH-009: an edit that names an unknown project keeps the last users too
def test_auth_009_unknown_project_after_start(tmp_path: Path) -> None:
    client = auth_app(tmp_path)
    sign_in(client, "an")
    users_file = tmp_path / "users.yaml"
    data = yaml.safe_load(users_file.read_text())
    data["users"][0]["projects"] = ["ghost"]
    before = users_file.stat().st_mtime_ns
    users_file.write_text(yaml.safe_dump(data))
    os.utime(users_file, ns=(before + 1_000_000, before + 1_000_000))
    assert client.get("/api/beads?project=a").status_code == 200
