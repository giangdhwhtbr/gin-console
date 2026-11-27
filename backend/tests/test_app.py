import subprocess
from pathlib import Path

import pytest
from fake_export import write_export
from fakes import ISSUES, Fake
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.beads.source import MISSING
from gin_console.config import ProjectEntry, Settings

BEADS = {
    "open": 3,
    "in_progress": 1,
    "blocked": 1,
    "ready": 2,
    "prep": 0,
    "epics": [
        {"id": "e1", "title": "Epic one", "status": "in_progress", "workflow": None},
        {"id": "e2", "title": "Epic two", "status": "open", "workflow": None},
    ],
    "stale": False,
}


def make_client(
    tmp_path: Path,
    projects: list[ProjectEntry],
    built: bool = True,
) -> TestClient:
    static = tmp_path / "dist"
    static.mkdir()
    if built:
        (static / "index.html").write_text("<html>console</html>")
        (static / "app.js").write_text("console.log(1)")
    settings = Settings(projects=projects)
    return TestClient(create_app(settings, static_dir=static))


@pytest.fixture
def fake(monkeypatch: pytest.MonkeyPatch) -> Fake:
    fake = Fake()
    monkeypatch.setattr(subprocess, "run", fake)
    return fake


# REQ-SESSIONS-001 REQ-QUOTA-001 (removed): the retired endpoints fall into the /api 404 route
def test_retired_endpoints_answer_404(tmp_path: Path) -> None:
    client = make_client(tmp_path, [])
    for path in ("/api/sessions", "/api/sessions/alpha/s-1/messages", "/api/quota"):
        assert client.get(path).status_code == 404


# REQ-SERVER-002
def test_server_002_health(tmp_path: Path) -> None:
    response = make_client(tmp_path, []).get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "0.2.0"}


# REQ-SERVER-004 (Retired projects endpoint)
def test_server_004_projects_endpoint_retired(tmp_path: Path, fake: Fake) -> None:
    client = make_client(tmp_path, [ProjectEntry(name="p", path=tmp_path)])
    response = client.get("/api/projects")
    assert response.status_code == 404
    assert "console" not in response.text
    assert fake.calls == []


# REQ-SERVER-006 (No workflow on epics), REQ-SERVER-010, REQ-BEADS-016: `pull` is null until pulled
def test_server_010_projects_beads_answer(tmp_path: Path, fake: Fake) -> None:
    present = tmp_path / "present"
    write_export(present, ISSUES)
    client = make_client(
        tmp_path,
        [
            ProjectEntry(name="present", path=present),
            ProjectEntry(name="absent", path=tmp_path / "absent"),
        ],
    )
    assert client.get("/api/projects/beads").json() == [
        {
            "name": "present",
            "path": str(present),
            "exists": True,
            "beads": BEADS,
            "pull": None,
            "attachments_fetch": None,
        },
        {
            "name": "absent",
            "path": str(tmp_path / "absent"),
            "exists": False,
            "beads": None,
            "pull": None,
            "attachments_fetch": None,
        },
    ]
    assert fake.calls == []  # the endpoint starts no process


# REQ-SERVER-010
def test_server_010_path_appears_later(tmp_path: Path, fake: Fake) -> None:
    later = tmp_path / "later"
    client = make_client(tmp_path, [ProjectEntry(name="later", path=later)])
    assert client.get("/api/projects/beads").json()[0]["exists"] is False
    later.mkdir()
    assert client.get("/api/projects/beads").json()[0]["exists"] is True


# REQ-SERVER-010
def test_server_010_block_error_in_response(tmp_path: Path, fake: Fake) -> None:
    (tmp_path / "s").mkdir()  # no .beads/issues.jsonl
    client = make_client(tmp_path, [ProjectEntry(name="s", path=tmp_path / "s")])
    body = client.get("/api/projects/beads").json()[0]
    assert body["beads"] == {"error": MISSING.format(path=".beads/issues.jsonl")}


# REQ-SERVER-004
@pytest.mark.parametrize("path", ["/", "/projects", "/projects/qwikfone"])
def test_server_004_spa_fallback(tmp_path: Path, path: str) -> None:
    response = make_client(tmp_path, []).get(path)
    assert response.status_code == 200
    assert response.text == "<html>console</html>"


# REQ-SERVER-004
def test_server_004_static_asset(tmp_path: Path) -> None:
    response = make_client(tmp_path, []).get("/app.js")
    assert response.text == "console.log(1)"


# REQ-SERVER-004
def test_server_004_unknown_api_is_404(tmp_path: Path) -> None:
    response = make_client(tmp_path, []).get("/api/unknown")
    assert response.status_code == 404
    assert "console" not in response.text


# REQ-SERVER-004
def test_server_004_traversal_does_not_escape_static_dir(tmp_path: Path) -> None:
    (tmp_path / "secret.txt").write_text("secret")
    response = make_client(tmp_path, []).get("/%2e%2e/secret.txt")
    assert "secret" not in response.text


# REQ-SERVER-004
def test_server_004_not_built_is_503(tmp_path: Path) -> None:
    response = make_client(tmp_path, [], built=False).get("/")
    assert response.status_code == 503
    assert "pnpm -C frontend build" in response.text


# REQ-SERVER-004
def test_server_004_null_byte_path_does_not_500(tmp_path: Path) -> None:
    response = make_client(tmp_path, []).get("/%00")
    assert response.status_code == 200
    assert response.text == "<html>console</html>"


# REQ-SERVER-004
def test_server_004_bare_api_is_404(tmp_path: Path) -> None:
    response = make_client(tmp_path, []).get("/api")
    assert response.status_code == 404
    assert "console" not in response.text
