from pathlib import Path

from fake_bd import FakeBd
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.config import ProjectEntry, Settings


# TC: TC-SERVER-012@e92ba2d1
def test_tc_server_012_retired_projects_endpoint(tmp_path: Path) -> None:
    # REQ-SERVER-004: GET /api/projects is 404, not index.html; /api/projects/beads still answers.
    dist = tmp_path / "dist"
    dist.mkdir()
    (dist / "index.html").write_text("<html>index</html>")
    (tmp_path / "alpha").mkdir()
    settings = Settings(projects=[ProjectEntry(name="alpha", path=tmp_path / "alpha")])
    client = TestClient(create_app(settings, static_dir=dist, run_bd=FakeBd()))

    retired = client.get("/api/projects")
    assert retired.status_code == 404
    assert "index" not in retired.text

    assert client.get("/api/projects/beads").status_code == 200
