import subprocess
from pathlib import Path

import pytest
from fakes import Fake
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.config import ProjectEntry, ServerSettings, Settings

WORKFLOW = {"stage": "plan", "layout": "sdd", "gates": {"requirement_confirmed": "satisfied"}}
BEADS = {
    "open": 3,
    "in_progress": 1,
    "blocked": 1,
    "ready": 2,
    "epics": [{"id": "e1", "title": "Epic one"}, {"id": "e2", "title": "Epic two"}],
}


def make_client(
    tmp_path: Path,
    projects: list[ProjectEntry],
    built: bool = True,
    scotty_base_url: str | None = None,
) -> TestClient:
    static = tmp_path / "dist"
    static.mkdir()
    if built:
        (static / "index.html").write_text("<html>console</html>")
        (static / "app.js").write_text("console.log(1)")
    settings = Settings(server=ServerSettings(scotty_base_url=scotty_base_url), projects=projects)
    return TestClient(create_app(settings, static_dir=static))


@pytest.fixture
def fake(monkeypatch: pytest.MonkeyPatch) -> Fake:
    fake = Fake()
    monkeypatch.setattr(subprocess, "run", fake)
    return fake


# REQ-SERVER-002
def test_server_002_health(tmp_path: Path) -> None:
    response = make_client(tmp_path, []).get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "0.1.0"}


# REQ-SERVER-003
def test_server_003_projects_exists_flags(tmp_path: Path, fake: Fake) -> None:
    present = tmp_path / "present"
    present.mkdir()
    client = make_client(
        tmp_path,
        [
            ProjectEntry(name="present", path=present, scotty_id="p"),
            ProjectEntry(name="absent", path=tmp_path / "absent"),
        ],
    )
    assert client.get("/api/projects").json() == [
        {
            "name": "present",
            "path": str(present),
            "scotty_id": "p",
            "scotty_url": None,
            "exists": True,
            "workflow": WORKFLOW,
            "beads": BEADS,
        },
        {
            "name": "absent",
            "path": str(tmp_path / "absent"),
            "scotty_id": None,
            "scotty_url": None,
            "exists": False,
            "workflow": None,
            "beads": None,
        },
    ]


# REQ-SERVER-003
def test_server_003_path_appears_later(tmp_path: Path, fake: Fake) -> None:
    later = tmp_path / "later"
    client = make_client(tmp_path, [ProjectEntry(name="later", path=later)])
    assert client.get("/api/projects").json()[0]["exists"] is False
    later.mkdir()
    assert client.get("/api/projects").json()[0]["exists"] is True


# REQ-SERVER-003
def test_server_003_scotty_url(tmp_path: Path, fake: Fake) -> None:
    (tmp_path / "s").mkdir()
    client = make_client(
        tmp_path,
        [ProjectEntry(name="s", path=tmp_path / "s", scotty_id="scotty")],
        scotty_base_url="https://h/",
    )
    assert client.get("/api/projects").json()[0]["scotty_url"] == "https://h/p/scotty"


# REQ-SERVER-003
@pytest.mark.parametrize(("scotty_id", "base"), [(None, "https://h"), ("scotty", None)])
def test_server_003_no_scotty_url(
    tmp_path: Path, fake: Fake, scotty_id: str | None, base: str | None
) -> None:
    (tmp_path / "s").mkdir()
    client = make_client(
        tmp_path,
        [ProjectEntry(name="s", path=tmp_path / "s", scotty_id=scotty_id)],
        scotty_base_url=base,
    )
    assert client.get("/api/projects").json()[0]["scotty_url"] is None


# REQ-SERVER-007
def test_server_007_missing_path_runs_nothing(tmp_path: Path, fake: Fake) -> None:
    client = make_client(tmp_path, [ProjectEntry(name="gone", path=tmp_path / "gone")])
    body = client.get("/api/projects").json()[0]
    assert (body["workflow"], body["beads"]) == (None, None)
    assert fake.calls == []


# REQ-SERVER-007
def test_server_007_block_error_in_response(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(subprocess, "run", Fake({"bd": FileNotFoundError()}))
    (tmp_path / "s").mkdir()
    client = make_client(tmp_path, [ProjectEntry(name="s", path=tmp_path / "s")])
    body = client.get("/api/projects").json()[0]
    assert body["beads"] == {"error": "bd not found"}
    assert body["workflow"] == WORKFLOW


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
