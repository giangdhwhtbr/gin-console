"""API cases of the Optional authentication change (gin-console-hlj): REQ-CONFIG-009,
REQ-AUTH-001 to 013 and 016, and the grant cases of REQ-SERVER-012 and REQ-REQUIREMENTS-010.
Each test performs the steps of one case through the HTTP API or the `user` command, with fake
CLIs, and reuses the helpers of the unit tests of the same change."""

import logging
import os
import sys
from pathlib import Path

import pytest
from fake_bd import FakeBd
from fastapi.testclient import TestClient
from httpx import Response
from test_auth_access_api import DAY, REPORTS_DAY, grant_of, grant_path, make, signed_in
from test_auth_api import (
    INVALID,
    LOCKED,
    PASSWORDS,
    REQUIRED,
    Clock,
    Verifies,
    auth_app,
    cookie_attributes,
    sign_in,
    user,
    verifies,  # noqa: F401  (the fixture)
    write_users,
)
from test_auth_cli import Console, password_of
from test_config import auth_config, write, write_users_file
from test_cross_site import REFUSED, site

from gin_console.app import create_app
from gin_console.auth.access import COOKIE
from gin_console.auth.passwords import DUMMY_HASH, PREFIX, hash_password, verify
from gin_console.auth.users import load_users, save_users
from gin_console.config import AuthSettings, ConfigError, ProjectEntry, Settings, load_settings


@pytest.fixture
def console(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> Console:
    return Console(tmp_path, capsys)


def console_login(console: Console, tmp_path: Path, name: str, password: str) -> Response:
    """Sign in through an app (auth on) that reads the users file the `user` command wrote."""
    settings = Settings(
        projects=[ProjectEntry(name=n, path=tmp_path / n) for n in ("a", "b")],
        auth=AuthSettings(enabled=True, users_file=console.users_file),
    )
    app = create_app(settings, run_bd=FakeBd(), schedule_pulls=False)
    return sign_in(TestClient(app), name, password)


# --- Config


# TC: TC-CONFIG-010@762f588f
def test_tc_config_010_auth_defaults(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setenv("HOME", str(tmp_path))
    auth = load_settings(write(tmp_path, "projects: []\n")).auth
    assert auth.enabled is False
    assert auth.session_ttl == 12 * 3600
    assert (auth.rate_limit.per_user, auth.rate_limit.per_ip) == (5, 20)
    assert auth.rate_limit.window == 15 * 60


# TC: TC-CONFIG-011@6005045a
def test_tc_config_011_auth_enabled_without_users(tmp_path: Path) -> None:
    users_file = tmp_path / "users.yaml"
    with pytest.raises(ConfigError) as exc:
        load_settings(auth_config(tmp_path, users_file))
    assert str(users_file) in str(exc.value)


# TC: TC-CONFIG-012@3c9ab682
def test_tc_config_012_auth_user_of_an_unknown_project(tmp_path: Path) -> None:
    with pytest.raises(ConfigError, match="ghost"):
        load_settings(auth_config(tmp_path, write_users_file(tmp_path, "[a, ghost]")))


# TC: TC-CONFIG-013@0d87de7e
@pytest.mark.parametrize(
    ("text", "field"),
    [
        ("{rate_limit: {per_user: 0}}", r"auth\.rate_limit\.per_user"),
        ("{session_ttl: 1m}", r"auth\.session_ttl"),
        ("{rate_limit: {window: 30s}}", r"auth\.rate_limit\.window"),
        ("{rate_limit: {per_ip: 2.5}}", r"auth\.rate_limit\.per_ip"),
    ],
)
def test_tc_config_013_auth_invalid_limit(tmp_path: Path, text: str, field: str) -> None:
    with pytest.raises(ConfigError, match=field):
        load_settings(write(tmp_path, f"auth: {text}\n"))


# --- Server and requirements: the grant path


# TC: TC-SERVER-023@5eeed6e3
def test_tc_server_023_mockup_files_through_a_grant(tmp_path: Path) -> None:
    app = make(tmp_path)
    _, grant = signed_in(app, "an")
    plain = TestClient(app.app)
    res = plain.get(grant_path("a", grant), headers=site("cross-site"))
    assert res.status_code == 200 and res.text == "body { color: red; }"
    res = plain.post(grant_path("a", grant), headers=site("cross-site"))
    assert res.status_code == 403 and res.json() == REFUSED


# TC: TC-REQUIREMENTS-062@a995eddc
def test_tc_requirements_062_grant_path(tmp_path: Path) -> None:
    app = make(tmp_path)
    folder = tmp_path / "a" / "docs" / "specs" / "ui" / "assets" / DAY
    (folder / "notes.txt").write_text("not served")
    _, grant = signed_in(app, "an")
    plain = TestClient(app.app)
    through = plain.get(grant_path("a", grant))
    assert through.status_code == 200 and through.text == "body { color: red; }"
    root, _ = signed_in(app, "root")
    direct = root.get(f"/api/requirements/mockups/a/files/ui/{DAY}/style.css")
    assert (direct.status_code, direct.text) == (200, through.text)
    assert plain.get(grant_path("a", grant, "notes.txt")).status_code == 404
    assert plain.get(grant_path("a", grant, "..%2f..%2fspec.md")).status_code == 404


# --- REQ-AUTH-001: auth off


# TC: TC-AUTH-001@a7eb8863
def test_tc_auth_001_no_auth_section(tmp_path: Path) -> None:
    for name in ("a", "b"):
        (tmp_path / name).mkdir()
    settings = Settings(projects=[ProjectEntry(name=n, path=tmp_path / n) for n in ("a", "b")])
    res = TestClient(create_app(settings, run_bd=FakeBd(), schedule_pulls=False)).get(
        "/api/projects/beads"
    )
    assert res.status_code == 200
    assert [p["name"] for p in res.json()] == ["a", "b"]
    assert "set-cookie" not in res.headers


# TC: TC-AUTH-002@05b75c41
def test_tc_auth_002_me_while_auth_is_off(tmp_path: Path) -> None:
    res = auth_app(tmp_path, enabled=False).get("/api/auth/me")
    assert res.status_code == 200 and res.json() == {"enabled": False, "user": None}


# TC: TC-AUTH-003@ba8c3963
def test_tc_auth_003_login_while_auth_is_off(tmp_path: Path) -> None:
    assert sign_in(auth_app(tmp_path, enabled=False), "an").status_code == 404


# --- REQ-AUTH-002: sign in


# TC: TC-AUTH-004@a76bce5b
def test_tc_auth_004_sign_in_right_password(tmp_path: Path) -> None:
    res = sign_in(auth_app(tmp_path), "an")
    assert res.status_code == 200
    body = res.json()
    assert (body["name"], body["email"], body["projects"]) == ("an", "an@x.io", ["a"])
    cookie = cookie_attributes(res)
    assert len(cookie["value"]) >= 43  # 32 random bytes, URL-safe base64
    assert "httponly" in cookie and cookie["samesite"].lower() == "strict"
    assert cookie["path"] == "/" and cookie["max-age"] == "43200"
    assert "mockup_grant" not in body


# TC: TC-AUTH-052@794bcd79
def test_tc_auth_052_no_grant_in_the_user(tmp_path: Path) -> None:
    client = auth_app(tmp_path)
    sign_in(client, "an")
    user_body = client.get("/api/auth/me").json()["user"]
    assert user_body["name"] == "an" and "mockup_grant" not in user_body


# TC: TC-AUTH-005@e0b0fbb5
def test_tc_auth_005_me_after_sign_in(tmp_path: Path) -> None:
    client = auth_app(tmp_path)
    sign_in(client, "an")
    res = client.get("/api/auth/me")
    assert res.status_code == 200
    assert res.json()["enabled"] is True and res.json()["user"]["name"] == "an"


# TC: TC-AUTH-006@bd454aba
def test_tc_auth_006_me_before_sign_in(tmp_path: Path) -> None:
    res = auth_app(tmp_path).get("/api/auth/me")
    assert res.status_code == 200 and res.json() == {"enabled": True, "user": None}


# TC: TC-AUTH-007@0f3eab97
def test_tc_auth_007_username_case(tmp_path: Path) -> None:
    res = sign_in(auth_app(tmp_path), "An", PASSWORDS["an"])
    assert res.status_code == 200 and res.json()["name"] == "an"


# --- REQ-AUTH-003: failed sign-in


# TC: TC-AUTH-008@c8662047
def test_tc_auth_008_wrong_password(tmp_path: Path) -> None:
    res = sign_in(auth_app(tmp_path), "an", "wrong")
    assert res.status_code == 401 and res.json() == INVALID
    assert "set-cookie" not in res.headers


# TC: TC-AUTH-009@f5d4fec9
def test_tc_auth_009_unknown_user(tmp_path: Path, verifies: Verifies) -> None:  # noqa: F811
    res = sign_in(auth_app(tmp_path), "bo", "anything")
    assert res.status_code == 401 and res.json() == INVALID
    assert "set-cookie" not in res.headers
    assert verifies.hashes == [DUMMY_HASH]  # a scrypt verification against the dummy hash


# TC: TC-AUTH-010@bbf8c8b4
def test_tc_auth_010_malformed_login_body(tmp_path: Path) -> None:
    res = auth_app(tmp_path).post("/api/auth/login", json={"username": "an"})
    assert res.status_code == 401 and res.json() == INVALID


# --- REQ-AUTH-004: rate limit


# TC: TC-AUTH-011@4abd3813
def test_tc_auth_011_username_locked(tmp_path: Path) -> None:
    client = auth_app(tmp_path)
    for _ in range(5):
        assert sign_in(client, "an", "wrong").status_code == 401
    res = sign_in(client, "an")
    assert res.status_code == 429 and res.json() == LOCKED
    assert int(res.headers["retry-after"]) > 0
    assert "set-cookie" not in res.headers


# TC: TC-AUTH-012@8778f1ab
def test_tc_auth_012_ip_locked(tmp_path: Path) -> None:
    client = auth_app(tmp_path)
    for n in range(20):
        assert sign_in(client, f"user-{n % 5}", "wrong").status_code == 401
    assert sign_in(client, "root").status_code == 429


# TC: TC-AUTH-013@67506eb7
def test_tc_auth_013_window_passes(tmp_path: Path) -> None:
    clock = Clock()
    client = auth_app(tmp_path, clock=clock)
    for _ in range(5):
        sign_in(client, "an", "wrong")
    assert sign_in(client, "an").status_code == 429
    clock.advance(15 * 60)
    assert sign_in(client, "an").status_code == 200


# TC: TC-AUTH-014@fa32eeb3
def test_tc_auth_014_success_resets_the_user(tmp_path: Path) -> None:
    client = auth_app(tmp_path)
    for _ in range(4):
        sign_in(client, "an", "wrong")
    assert sign_in(client, "an").status_code == 200
    for _ in range(4):
        assert sign_in(client, "an", "wrong").status_code == 401
    assert sign_in(client, "an", "wrong").status_code == 401  # checked, not 429


# --- REQ-AUTH-005, 006: the session


# TC: TC-AUTH-015@34a48630
def test_tc_auth_015_no_cookie(tmp_path: Path) -> None:
    res = auth_app(tmp_path).get("/api/overview")
    assert res.status_code == 401 and res.json() == REQUIRED


# TC: TC-AUTH-016@ed995ce7
def test_tc_auth_016_open_routes(tmp_path: Path) -> None:
    client = auth_app(tmp_path)
    assert client.get("/api/health").status_code == 200
    assert client.get("/api/auth/me").status_code == 200
    assert client.post("/api/auth/logout").status_code == 204


# TC: TC-AUTH-017@f74bb67f
def test_tc_auth_017_frontend_served(tmp_path: Path) -> None:
    res = auth_app(tmp_path).get("/")
    assert res.status_code == 200 and res.text == "<html>console</html>"


# TC: TC-AUTH-018@2a9532ba
def test_tc_auth_018_forged_token(tmp_path: Path) -> None:
    client = auth_app(tmp_path)
    client.cookies.set(COOKIE, "forged")
    assert client.get("/api/overview").status_code == 401


# TC: TC-AUTH-019@f69df8e0
def test_tc_auth_019_session_expired(tmp_path: Path) -> None:
    clock = Clock()
    client = auth_app(tmp_path, clock=clock)
    sign_in(client, "an")
    clock.advance(12 * 3600)
    assert client.get("/api/overview").status_code == 401


# TC: TC-AUTH-020@b6484c3d
def test_tc_auth_020_sign_out_ends_the_session(tmp_path: Path) -> None:
    client = auth_app(tmp_path)
    token = cookie_attributes(sign_in(client, "an"))["value"]
    res = client.post("/api/auth/logout")
    assert res.status_code == 204
    assert cookie_attributes(res)["max-age"] == "0"
    client.cookies.set(COOKIE, token)
    assert client.get("/api/overview").status_code == 401


# --- REQ-AUTH-007, 008: project access


# TC: TC-AUTH-021@921252a6
def test_tc_auth_021_lists_show_only_allowed_projects(tmp_path: Path) -> None:
    an, _ = signed_in(make(tmp_path), "an")
    assert [p["name"] for p in an.get("/api/projects/beads").json()] == ["a"]
    assert [p["name"] for p in an.get("/api/overview").json()["projects"]] == ["a"]


# TC: TC-AUTH-022@b40f5733
def test_tc_auth_022_other_project_is_not_found(tmp_path: Path) -> None:
    an, _ = signed_in(make(tmp_path), "an")
    for url in (
        "/api/beads?project=b",
        "/api/milestones/b/wbs?format=csv",
        "/api/reports?project=b",
    ):
        assert an.get(url).status_code == 404, url


# TC: TC-AUTH-023@59fadbf2
def test_tc_auth_023_all_projects(tmp_path: Path) -> None:
    root, _ = signed_in(make(tmp_path), "root")
    assert [p["name"] for p in root.get("/api/projects/beads").json()] == ["a", "b"]


# TC: TC-AUTH-024@a2976705
def test_tc_auth_024_shared_cache(tmp_path: Path) -> None:
    app = make(tmp_path)
    root, _ = signed_in(app, "root")
    an, _ = signed_in(app, "an")
    assert root.get("/api/beads?project=b").status_code == 200
    assert an.get("/api/beads?project=b").status_code == 404


# TC: TC-AUTH-025@2be37047
def test_tc_auth_025_refresh_pulls_own_projects(tmp_path: Path) -> None:
    bd = FakeBd()
    an, _ = signed_in(make(tmp_path, bd), "an")
    assert an.post("/api/refresh").status_code == 204
    assert bd.calls == [tmp_path / "a"]


# --- REQ-AUTH-009: user changes while running


# TC: TC-AUTH-026@93c93073
def test_tc_auth_026_password_reset_ends_the_session(tmp_path: Path) -> None:
    client = auth_app(tmp_path)
    sign_in(client, "an")
    write_users(
        tmp_path / "users.yaml", [user("an", ["a"], hash_password("new")), user("root", "*")]
    )
    assert client.get("/api/overview").status_code == 401


# TC: TC-AUTH-027@a9f757c0
def test_tc_auth_027_project_unassigned(tmp_path: Path) -> None:
    client = auth_app(tmp_path, users=[user("an", ["a", "b"])])
    sign_in(client, "an")
    assert client.get("/api/beads?project=b").status_code == 200
    write_users(tmp_path / "users.yaml", [user("an", ["a"])])
    assert client.get("/api/beads?project=b").status_code == 404


# TC: TC-AUTH-028@aaf1805e
def test_tc_auth_028_broken_users_file(tmp_path: Path, caplog: pytest.LogCaptureFixture) -> None:
    client = auth_app(tmp_path)
    sign_in(client, "an")
    users_file = tmp_path / "users.yaml"
    before = users_file.stat().st_mtime_ns
    users_file.write_text("users: [\n")
    os.utime(users_file, ns=(before + 1_000_000, before + 1_000_000))
    with caplog.at_level(logging.ERROR, logger="gin_console.auth"):
        assert client.get("/api/beads?project=a").status_code == 200
        assert client.get("/api/beads?project=b").status_code == 404
    errors = [r for r in caplog.records if r.levelno == logging.ERROR]
    assert len(errors) == 1 and str(users_file) in errors[0].getMessage()


# --- REQ-AUTH-010 to 013: the user command and the users file


# TC: TC-AUTH-029@e49311e7
def test_tc_auth_029_user_created(console: Console, tmp_path: Path) -> None:
    password = password_of(console.ok("add", "an", "--email", "an@x.io", "--project", "a"))
    stored = str(console.users()["an"]["password_hash"])
    assert stored.startswith("scrypt$") and verify(password, stored)
    assert password not in console.users_file.read_text()
    assert console_login(console, tmp_path, "an", password).status_code == 200


# TC: TC-AUTH-030@4e241174
def test_tc_auth_030_user_add_unknown_project(console: Console) -> None:
    assert "ghost" in console.refused("add", "an", "--email", "an@x.io", "--project", "ghost")
    assert not console.users_file.exists()


# TC: TC-AUTH-031@3e66d85e
def test_tc_auth_031_user_add_name_taken(console: Console) -> None:
    console.ok("add", "an", "--email", "an@x.io", "--project", "a")
    console.refused("add", "an", "--email", "other@x.io", "--all-projects")


# TC: TC-AUTH-032@8673055b
def test_tc_auth_032_password_reset(console: Console, tmp_path: Path) -> None:
    old = password_of(console.ok("add", "an", "--email", "an@x.io", "--project", "a"))
    new = password_of(console.ok("passwd", "an"))
    stored = str(console.users()["an"]["password_hash"])
    assert verify(new, stored) and not verify(old, stored)
    assert console_login(console, tmp_path, "an", new).status_code == 200
    assert console_login(console, tmp_path, "an", old).status_code == 401


# TC: TC-AUTH-033@b8c5ce5b
def test_tc_auth_033_password_reset_unknown_user(console: Console) -> None:
    console.ok("add", "an", "--email", "an@x.io", "--all-projects")
    console.refused("passwd", "bo")


# TC: TC-AUTH-034@16968093
def test_tc_auth_034_assign_and_unassign(console: Console) -> None:
    console.ok("add", "an", "--email", "an@x.io", "--project", "a")
    console.ok("assign", "an", "b")
    console.ok("unassign", "an", "a")
    assert console.users()["an"]["projects"] == ["b"]


# TC: TC-AUTH-035@93cfacc0
def test_tc_auth_035_remove_a_user(console: Console) -> None:
    console.ok("add", "an", "--email", "an@x.io", "--project", "a")
    console.ok("add", "root", "--email", "root@x.io", "--all-projects")
    console.ok("remove", "an")
    assert list(console.users()) == ["root"]


# TC: TC-AUTH-036@1689a920
def test_tc_auth_036_list_users(console: Console) -> None:
    console.ok("add", "an", "--email", "an@x.io", "--project", "a", "b")
    console.ok("add", "root", "--email", "root@x.io", "--all-projects")
    out = console.ok("list")
    assert out == "an\tan@x.io\ta,b\nroot\troot@x.io\t*\n"
    assert "scrypt$" not in out


# TC: TC-AUTH-037@df952b9d
def test_tc_auth_037_users_file_mode_and_format(console: Console) -> None:
    console.ok("add", "an", "--email", "an@x.io", "--all-projects")
    assert str(console.users()["an"]["password_hash"]).startswith(PREFIX)
    assert PREFIX == "scrypt$16384$8$1$"
    if sys.platform != "win32":  # os.chmod there sets only the read-only flag
        assert console.users_file.stat().st_mode & 0o777 == 0o600


# TC: TC-AUTH-038@db6a68f3
def test_tc_auth_038_users_file_atomic_write(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    path = tmp_path / "users.yaml"
    save_users(path, [user("an", ["a"])])
    before = path.read_bytes()

    def fail(src: object, dst: object) -> None:
        raise OSError("disk full")

    monkeypatch.setattr(os, "replace", fail)
    with pytest.raises(OSError, match="disk full"):
        save_users(path, [user("root", "*")])
    assert path.read_bytes() == before
    assert list(load_users(path, ["a", "b"])) == ["an"]


# --- REQ-AUTH-016: the mockup grant


# TC: TC-AUTH-039@29073c90
def test_tc_auth_039_grant_styled_mockup(tmp_path: Path) -> None:
    app = make(tmp_path)
    _, grant = signed_in(app, "an")
    res = TestClient(app.app).get(grant_path("a", grant))
    assert res.status_code == 200 and res.text == "body { color: red; }"


# TC: TC-AUTH-040@84e2873f
def test_tc_auth_040_grant_other_project(tmp_path: Path) -> None:
    app = make(tmp_path)
    _, grant = signed_in(app, "an")
    assert TestClient(app.app).get(grant_path("b", grant)).status_code == 404


# TC: TC-AUTH-041@251001d0
def test_tc_auth_041_grant_ended_session(tmp_path: Path) -> None:
    app = make(tmp_path)
    an, grant = signed_in(app, "an")
    an.post("/api/auth/logout")
    assert TestClient(app.app).get(grant_path("a", grant)).status_code == 404


# TC: TC-AUTH-042@3c1d249b
def test_tc_auth_042_grant_is_not_a_session(tmp_path: Path) -> None:
    app = make(tmp_path)
    _, grant = signed_in(app, "an")
    client = TestClient(app.app)
    client.cookies.set(COOKIE, grant)
    assert client.get("/api/overview").status_code == 401


# TC: TC-AUTH-053@4effc3cb
def test_tc_auth_053_grant_of_another_folder(tmp_path: Path) -> None:
    app = make(tmp_path)
    an, grant = signed_in(app, "an")
    assert grant != grant_of(an, "a", "reports", REPORTS_DAY)
    other = f"/api/requirements/mockups/a/g/{grant}/files/reports/{REPORTS_DAY}/index.html"
    plain = TestClient(app.app)
    assert plain.get(grant_path("a", grant, "index.html")).status_code == 200
    assert plain.get(other).status_code == 404


# TC: TC-AUTH-054@610c930b
def test_tc_auth_054_malformed_grant(tmp_path: Path) -> None:
    app = make(tmp_path)
    an, grant = signed_in(app, "an")
    grant_id = grant.rpartition(".")[0]
    token = an.cookies[COOKIE]
    plain = TestClient(app.app)
    bodies = set()
    for bad in ("abc", f"{grant_id}.AAAA", token):
        res = plain.get(grant_path("a", bad))
        assert res.status_code == 404
        bodies.add(res.content)
    assert len(bodies) == 1  # one body for every refusal


# TC: TC-AUTH-055@2d00ead9
def test_tc_auth_055_grant_with_auth_off(tmp_path: Path) -> None:
    folder = tmp_path / "a" / "docs" / "specs" / "ui" / "assets" / DAY
    folder.mkdir(parents=True)
    (folder / "description.md").write_text(f"# ui\nConfirmed: {DAY}\n")
    (folder / "index.html").write_text("<p>x</p>")
    (folder / "style.css").write_text("body { color: red; }")
    client = auth_app(tmp_path, enabled=False)
    listing = client.get("/api/requirements/mockups", params={"project": "a"}).json()["mockups"]
    assert listing and all(m["grant"] is None for m in listing)
    assert client.get(grant_path("a", "x.y")).status_code == 404
    plain = client.get(f"/api/requirements/mockups/a/files/ui/{DAY}/style.css")
    assert plain.status_code == 200 and plain.text == "body { color: red; }"
