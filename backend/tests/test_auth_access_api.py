"""Project access, refresh within access and the mockup grant (REQ-AUTH-007, 008, 016)."""

import inspect
from collections.abc import Callable
from pathlib import Path
from typing import Any

import fastapi.routing
import pytest
from fake_bd import FakeBd
from fake_export import bead, write_export
from fake_gin import FakeGin, trace
from fake_gw import FakeGw
from fastapi.testclient import TestClient
from test_auth_api import auth_app, sign_in, user, write_users

from gin_console.app import create_app
from gin_console.auth.access import COOKIE
from gin_console.config import ProjectEntry, Settings
from gin_console.projects.models import BlockError
from gin_console.requirements.source import RequirementsError

DAY = "2026-11-22"
REPORTS_DAY = "2026-11-12"
CSS = "body { color: red; }"
PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 100
NOT_FOUND = {"error": "not found"}
POLICY = (
    "sandbox allow-scripts; default-src 'self' 'unsafe-inline' data: blob:; "
    "connect-src 'none'; form-action 'none'; frame-src 'none'"
)

# Every route that takes a project, by path or by `project` query, with project `b`.
PROJECT_ROUTES = [
    ("/api/beads", "/api/beads?project=b"),
    ("/api/beads/milestones", "/api/beads/milestones?project=b"),
    ("/api/beads/{project}/{bead_id}", "/api/beads/b/x-1"),
    ("/api/beads/{project}/{bead_id}/images/{n}", "/api/beads/b/x-1/images/1"),
    ("/api/beads/{project}/{bead_id}/comments", "/api/beads/b/x-1/comments"),
    ("/api/beads/{project}/{bead_id}/workflow", "/api/beads/b/x-1/workflow"),
    ("/api/milestones", "/api/milestones?project=b"),
    ("/api/milestones/{project}/wbs", "/api/milestones/b/wbs?format=csv"),
    ("/api/milestones/{project}/{milestone_id}", "/api/milestones/b/m-1"),
    ("/api/requirements", "/api/requirements?project=b"),
    ("/api/requirements/reqs/{project}/{req_id}", "/api/requirements/reqs/b/REQ-X-001"),
    ("/api/requirements/changes", "/api/requirements/changes?project=b"),
    ("/api/requirements/changes/{project}/{change}", "/api/requirements/changes/b/c"),
    ("/api/requirements/mockups", "/api/requirements/mockups?project=b"),
    (
        "/api/requirements/mockups/{project}/files/{capability}/{day}/{path:path}",
        f"/api/requirements/mockups/b/files/ui/{DAY}/style.css",
    ),
    (
        "/api/requirements/mockups/{project}/g/{grant}/files/{capability}/{day}/{path:path}",
        f"/api/requirements/mockups/b/g/{{grant}}/files/ui/{DAY}/style.css",
    ),
    ("/api/reports", "/api/reports?project=b"),
    ("/api/reports/team", "/api/reports/team?project=b"),
    ("/api/reports/status", "/api/reports/status?project=b"),
    ("/api/reports/bugs", "/api/reports/bugs?project=b"),
]


def fill(project: Path) -> None:
    """A bead `x-1` with an image, a change `c`, a confirmed mockup `ui` with `index.html` and
    `style.css`, and a second confirmed mockup `reports` with `index.html`."""
    image = project / "qa" / "evidence" / "01.png"
    image.parent.mkdir(parents=True)
    image.write_bytes(PNG)
    write_export(project, [bead("x-1", description="![one](qa/evidence/01.png)")])
    change = project / "docs" / "changes" / "c"
    change.mkdir(parents=True)
    (change / "01-proposal.md").write_text("# C\n\nEpic: x-1\n")
    folder = project / "docs" / "specs" / "ui" / "assets" / DAY
    folder.mkdir(parents=True)
    (folder / "description.md").write_text(f"# ui\nConfirmed: {DAY}\n")
    (folder / "index.html").write_text('<link rel="stylesheet" href="style.css">')
    (folder / "style.css").write_text(CSS)
    reports = project / "docs" / "specs" / "reports" / "assets" / REPORTS_DAY
    reports.mkdir(parents=True)
    (reports / "description.md").write_text(f"# reports\nConfirmed: {REPORTS_DAY}\n")
    (reports / "index.html").write_text("<p>reports</p>")


def make(tmp_path: Path, bd: FakeBd | None = None) -> TestClient:
    """`an` with `[a]` and `root` with every project, over projects `a` and `b` with data."""
    client = auth_app(
        tmp_path,
        run_bd=bd or FakeBd(),
        run_gw=FakeGw(),
        run_gin=FakeGin({"trace": trace(), "reqs": RequirementsError("no reqs")}),
        run_epic_workflow=lambda cwd, ident: BlockError(error="no workflow"),
    )
    for name in ("a", "b"):
        fill(tmp_path / name)
    return client


def grant_of(client: TestClient, project: str, capability: str = "ui", date: str = DAY) -> str:
    """The grant the mockup list gives `client` for one folder of `project`."""
    res = client.get("/api/requirements/mockups", params={"project": project})
    mockups = res.json()["mockups"]
    grant: str = next(
        m["grant"] for m in mockups if (m["capability"], m["date"]) == (capability, date)
    )
    return grant


def signed_in(client: TestClient, name: str) -> tuple[TestClient, str]:
    """A new client of the same app signed in as `name`, and its grant of `ui/DAY` in `a`."""
    other = TestClient(client.app)
    sign_in(other, name)
    return other, grant_of(other, "a")


def unknown(url: str) -> str:
    return url.replace("/b/", "/ghost/").replace("project=b", "project=ghost")


# REQ-AUTH-007: Other project, for every route that takes a project
@pytest.mark.parametrize(("route", "url"), PROJECT_ROUTES, ids=[r for r, _ in PROJECT_ROUTES])
def test_auth_007_other_project(tmp_path: Path, route: str, url: str) -> None:
    app = make(tmp_path)
    root, _ = signed_in(app, "root")
    root_grant = grant_of(root, "b")
    an, an_grant = signed_in(app, "an")
    allowed = root.get(url.format(grant=root_grant))
    assert allowed.status_code != 404, allowed.text  # the route reaches `b` for its user
    refused = an.get(url.format(grant=an_grant))
    assert refused.status_code == 404
    # the same answer as a project that is not configured
    assert refused.content == an.get(unknown(url).format(grant=an_grant)).content


def api_routes(app: Any) -> list[tuple[str, Callable[..., Any]]]:
    """The path and endpoint of every route; FastAPI 0.143 keeps included routers lazy."""
    contexts = getattr(fastapi.routing, "iter_route_contexts", None)
    routes = contexts(app.routes) if contexts is not None else app.routes
    return [(route.path, route.endpoint) for route in routes if route.endpoint is not None]


# REQ-AUTH-007: a new route that takes a project must be in PROJECT_ROUTES
def test_auth_007_every_project_route_is_listed(tmp_path: Path) -> None:
    routes = {
        path
        for path, endpoint in api_routes(make(tmp_path).app)
        if "{project}" in path or "project" in inspect.signature(endpoint).parameters
    }
    assert routes == {route for route, _ in PROJECT_ROUTES}


# REQ-AUTH-007: Filtered lists
def test_auth_007_filtered_lists(tmp_path: Path) -> None:
    an, _ = signed_in(make(tmp_path), "an")
    assert [p["name"] for p in an.get("/api/projects/beads").json()] == ["a"]
    assert [p["name"] for p in an.get("/api/overview").json()["projects"]] == ["a"]


# REQ-AUTH-007: All projects
def test_auth_007_all_projects(tmp_path: Path) -> None:
    root, _ = signed_in(make(tmp_path), "root")
    assert [p["name"] for p in root.get("/api/projects/beads").json()] == ["a", "b"]
    assert [p["name"] for p in root.get("/api/overview").json()["projects"]] == ["a", "b"]


# REQ-AUTH-007: a user with no project sees none
def test_auth_007_no_project(tmp_path: Path) -> None:
    app = make(tmp_path)
    write_users(tmp_path / "users.yaml", [user("an", []), user("root", "*")])
    an = TestClient(app.app)
    sign_in(an, "an")
    assert an.get("/api/projects/beads").json() == []
    assert an.get("/api/overview").json()["projects"] == []
    assert an.get("/api/beads?project=a").status_code == 404


# REQ-AUTH-007: Shared cache
@pytest.mark.parametrize(
    "url", ["/api/beads?project=b", "/api/reports?project=b", "/api/requirements?project=b"]
)
def test_auth_007_shared_cache(tmp_path: Path, url: str) -> None:
    app = make(tmp_path)
    root, _ = signed_in(app, "root")
    an, _ = signed_in(app, "an")
    assert root.get(url).status_code == 200
    assert an.get(url).status_code == 404


# REQ-AUTH-008: Own projects only
def test_auth_008_own_projects_only(tmp_path: Path) -> None:
    bd = FakeBd()
    app = make(tmp_path, bd)
    an, _ = signed_in(app, "an")
    assert an.post("/api/refresh").status_code == 204
    assert bd.calls == [tmp_path / "a"]
    root, _ = signed_in(app, "root")
    bd.calls.clear()
    assert root.post("/api/refresh").status_code == 204
    assert sorted(bd.calls) == [tmp_path / "a", tmp_path / "b"]


# REQ-AUTH-008: refresh drops the cached answers of a signed-in user too
def test_auth_008_refresh_drops_caches(tmp_path: Path) -> None:
    an, _ = signed_in(make(tmp_path), "an")
    assert [b["id"] for b in an.get("/api/beads?project=a").json()] == ["x-1"]
    write_export(tmp_path / "a", [bead("x-2")])
    an.post("/api/refresh")
    assert [b["id"] for b in an.get("/api/beads?project=a").json()] == ["x-2"]


def grant_path(project: str, grant: str, name: str = "style.css", folder: str = f"ui/{DAY}") -> str:
    return f"/api/requirements/mockups/{project}/g/{grant}/files/{folder}/{name}"


# REQ-AUTH-016: Styled mockup, through the grant of the mockup list and without a cookie
def test_auth_016_styled_mockup(tmp_path: Path) -> None:
    app = make(tmp_path)
    _, grant = signed_in(app, "an")
    res = TestClient(app.app).get(grant_path("a", grant), headers={"sec-fetch-site": "cross-site"})
    assert res.status_code == 200 and res.text == CSS
    assert res.headers["content-security-policy"] == POLICY
    assert res.headers["x-content-type-options"] == "nosniff"


# REQ-AUTH-016: the grant is `<grant id>.<mac>`, one id per session and one mac per folder
def test_auth_016_grant_format(tmp_path: Path) -> None:
    an, grant = signed_in(make(tmp_path), "an")
    reports = grant_of(an, "a", "reports", REPORTS_DAY)
    grant_id, _, mac = grant.rpartition(".")
    assert reports.rpartition(".")[0] == grant_id and reports != grant
    assert len(mac) == 43 and "=" not in mac  # SHA-256, unpadded base64url
    assert an.cookies[COOKIE] not in (grant_id, grant)
    assert grant_of(an, "a") == grant  # the same folder gets the same grant again


# REQ-AUTH-016: Grant of another folder
def test_auth_016_grant_of_another_folder(tmp_path: Path) -> None:
    app = make(tmp_path)
    an, grant = signed_in(app, "an")
    reports = grant_path("a", grant, "index.html", f"reports/{REPORTS_DAY}")
    res = TestClient(app.app).get(reports)
    assert res.status_code == 404 and res.json() == NOT_FOUND
    # the same file through its own folder's grant
    own = grant_of(an, "a", "reports", REPORTS_DAY)
    res = TestClient(app.app).get(reports.replace(grant, own))
    assert res.status_code == 200 and res.text == "<p>reports</p>"


# REQ-AUTH-016: Other project, also for a user allowed both projects
def test_auth_016_other_project(tmp_path: Path) -> None:
    app = make(tmp_path)
    _, grant = signed_in(app, "an")
    res = TestClient(app.app).get(grant_path("b", grant))
    assert res.status_code == 404 and res.json() == NOT_FOUND
    _, root_grant = signed_in(app, "root")
    res = TestClient(app.app).get(grant_path("b", root_grant))
    assert res.status_code == 404 and res.json() == NOT_FOUND


# REQ-AUTH-016: Ended session
def test_auth_016_ended_session(tmp_path: Path) -> None:
    app = make(tmp_path)
    an, grant = signed_in(app, "an")
    an.post("/api/auth/logout")
    res = TestClient(app.app).get(grant_path("a", grant))
    assert res.status_code == 404 and res.json() == NOT_FOUND


# REQ-AUTH-016: Malformed grant
def test_auth_016_malformed_grant(tmp_path: Path) -> None:
    app = make(tmp_path)
    an, grant = signed_in(app, "an")
    _, other_grant = signed_in(app, "an")
    grant_id, _, mac = grant.rpartition(".")
    token = an.cookies[COOKIE]
    flipped = ("B" if mac[0] == "A" else "A") + mac[1:]
    for bad in (
        "abc",
        token,
        grant_id,
        f"{grant_id}.{flipped}",  # a valid grant id with a wrong mac
        f"{grant_id}.",
        f".{mac}",
        f"{other_grant.rpartition('.')[0]}.{mac}",  # another session's id with this mac
        f"{grant}.{mac}",
        f"{grant_id}.%C3%A9",  # a non-ASCII mac
    ):
        res = TestClient(app.app).get(grant_path("a", bad))
        assert res.status_code == 404 and res.json() == NOT_FOUND, bad
    # a signed-in user's cookie does not stand in for a grant
    res = an.get(grant_path("a", "abc"))
    assert res.status_code == 404 and res.json() == NOT_FOUND


# REQ-AUTH-016: Grant is not a session
def test_auth_016_grant_is_not_a_session(tmp_path: Path) -> None:
    app = make(tmp_path)
    _, grant = signed_in(app, "an")
    for cookie in (grant, grant.rpartition(".")[0]):
        client = TestClient(app.app)
        client.cookies.set(COOKIE, cookie)
        res = client.get("/api/overview")
        assert res.status_code == 401 and res.json() == {"error": "sign-in required"}


# REQ-AUTH-016: a grant grants nothing but GET requests of the grant path
def test_auth_016_get_only(tmp_path: Path) -> None:
    app = make(tmp_path)
    an, grant = signed_in(app, "an")
    plain = TestClient(app.app)
    assert plain.post(grant_path("a", grant)).status_code == 401
    assert plain.head(grant_path("a", grant)).status_code == 401
    assert plain.get(f"/api/requirements/mockups/a/files/ui/{DAY}/style.css").status_code == 401
    assert plain.get(f"/api/beads?project=a&g={grant}").status_code == 401
    assert plain.get(f"/api/requirements/mockups?project=a&g={grant}").status_code == 401
    # with a session cookie, a method other than GET does not pass the grant check either
    assert an.head(grant_path("a", grant)).status_code == 405


# REQ-AUTH-016: Auth off, the list has no grant and the grant path answers 404
def test_auth_016_off(tmp_path: Path) -> None:
    fill(tmp_path / "a")
    settings = Settings(projects=[ProjectEntry(name="a", path=tmp_path / "a")])
    client = TestClient(create_app(settings, run_bd=FakeBd(), schedule_pulls=False))
    mockups = client.get("/api/requirements/mockups", params={"project": "a"}).json()["mockups"]
    assert len(mockups) == 2 and [m["grant"] for m in mockups] == [None, None]
    assert client.get(f"/api/requirements/mockups/a/files/ui/{DAY}/style.css").text == CSS
    res = client.get(grant_path("a", "anything"))
    assert res.status_code == 404 and res.json() == NOT_FOUND
