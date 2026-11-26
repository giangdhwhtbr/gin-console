from pathlib import Path

import pytest
from fake_bd import FakeBd
from fastapi.testclient import TestClient

from gin_console.app import create_app, refuses_cross_site
from gin_console.config import ProjectEntry, Settings

DAY = "2026-11-22"
FILE = f"/api/requirements/mockups/p/files/ui/{DAY}/style.css"
REFUSED = {"error": "cross-site request refused"}


def client(tmp_path: Path, bd: FakeBd) -> TestClient:
    """An app over project `p`, which has a confirmed mockup folder with `style.css`."""
    (tmp_path / "dist").mkdir()
    (tmp_path / "dist" / "index.html").write_text("<html>console</html>")
    folder = tmp_path / "p" / "docs" / "specs" / "ui" / "assets" / DAY
    folder.mkdir(parents=True)
    (folder / "description.md").write_text(f"# ui\nConfirmed: {DAY}\n")
    (folder / "style.css").write_text("body { color: red; }")
    settings = Settings(projects=[ProjectEntry(name="p", path=tmp_path / "p")])
    app = create_app(settings, static_dir=tmp_path / "dist", run_bd=bd, schedule_pulls=False)
    return TestClient(app)


def site(value: str) -> dict[str, str]:
    return {"sec-fetch-site": value}


# REQ-SERVER-012
@pytest.mark.parametrize(
    ("method", "path", "site", "refused"),
    [
        ("GET", "/api/projects/beads", "cross-site", True),
        ("GET", "/api/projects/beads", "same-site", True),
        ("POST", "/api/refresh", "cross-site", True),
        ("GET", "/api", "cross-site", True),
        ("GET", "/api/", "cross-site", True),
        ("GET", "/api/projects/beads", "same-origin", False),
        ("GET", "/api/projects/beads", "none", False),
        ("GET", "/api/projects/beads", None, False),
        ("GET", "/api/projects/beads", "", False),
        ("GET", "/api/projects/beads", "Cross-Site", True),
        ("GET", "/api/projects/beads", "SAME-SITE", True),
        ("GET", FILE, "cross-site", False),
        ("GET", FILE, "same-site", False),
        ("HEAD", FILE, "cross-site", True),
        ("POST", FILE, "cross-site", True),
        ("GET", "/api/requirements/mockups/m/other/x.css", "cross-site", True),
        ("GET", "/api/requirements/mockups?project=m", "cross-site", True),
        ("GET", "/api/requirements/mockups/files/x", "cross-site", True),
        ("GET", "/api/requirements/mockups//files/x", "cross-site", True),
        ("GET", "/api/x/api/requirements/mockups/m/files/x", "cross-site", True),
        ("GET", "/beads", "cross-site", False),
        ("GET", "/apix", "cross-site", False),
    ],
)
def test_server_012_rule(method: str, path: str, site: str | None, refused: bool) -> None:
    assert refuses_cross_site(method, path.split("?")[0], site) is refused


# REQ-SERVER-012: Image from another site
def test_server_012_image_from_another_site(tmp_path: Path) -> None:
    res = client(tmp_path, FakeBd()).get(
        "/api/projects/beads", headers={**site("cross-site"), "accept-encoding": "gzip"}
    )
    assert res.status_code == 403
    assert res.content == b'{"error":"cross-site request refused"}'
    assert res.json() == REFUSED
    assert "content-encoding" not in res.headers


# REQ-SERVER-012: Image from another site (same host, other port)
def test_server_012_same_site(tmp_path: Path) -> None:
    res = client(tmp_path, FakeBd()).get("/api/projects/beads", headers=site("same-site"))
    assert res.status_code == 403 and res.json() == REFUSED


# REQ-SERVER-012: Refresh from another site
def test_server_012_refresh_from_another_site(tmp_path: Path) -> None:
    bd = FakeBd()
    res = client(tmp_path, bd).post("/api/refresh", headers=site("cross-site"))
    assert res.status_code == 403 and res.json() == REFUSED
    assert bd.calls == []


# REQ-SERVER-012: Refresh from the console still pulls
def test_server_012_refresh_same_origin(tmp_path: Path) -> None:
    bd = FakeBd()
    res = client(tmp_path, bd).post("/api/refresh", headers=site("same-origin"))
    assert res.status_code == 204
    assert bd.calls == [tmp_path / "p"]


# REQ-SERVER-012: The console itself
@pytest.mark.parametrize("value", ["same-origin", "none"])
def test_server_012_the_console_itself(tmp_path: Path, value: str) -> None:
    res = client(tmp_path, FakeBd()).get("/api/projects/beads", headers=site(value))
    assert res.status_code == 200


# REQ-SERVER-012: Tools
def test_server_012_tools(tmp_path: Path) -> None:
    res = client(tmp_path, FakeBd()).get("/api/projects/beads")
    assert res.status_code == 200


# REQ-SERVER-012: Mockup files
def test_server_012_mockup_files(tmp_path: Path) -> None:
    app = client(tmp_path, FakeBd())
    res = app.get(FILE, headers=site("cross-site"))
    assert res.status_code == 200 and res.text == "body { color: red; }"
    res = app.post(FILE, headers=site("cross-site"))
    assert res.status_code == 403 and res.json() == REFUSED


# REQ-SERVER-012: the exception follows the decoded path the router matches
def test_server_012_percent_encoded_path(tmp_path: Path) -> None:
    app = client(tmp_path, FakeBd())
    res = app.get(
        f"/api/requirements/mockups/p/%66iles/ui/{DAY}/style.css", headers=site("cross-site")
    )
    assert res.status_code == 200
    res = app.get("/api/project%73/beads", headers=site("cross-site"))
    assert res.status_code == 403 and res.json() == REFUSED


# REQ-SERVER-012: `..` segments under the exception reach only the mockup file endpoint
def test_server_012_dot_segments(tmp_path: Path) -> None:
    app = client(tmp_path, FakeBd())
    res = app.get(
        "/api/requirements/mockups/p/files/%2E%2E/%2E%2E/%2E%2E/%2E%2E/%2E%2E/projects/beads",
        headers=site("cross-site"),
    )
    assert res.status_code == 404


# REQ-SERVER-012: the bare /api and the /api 404 catch-all
@pytest.mark.parametrize("path", ["/api", "/api/", "/api/nothing/here"])
def test_server_012_not_found_paths(tmp_path: Path, path: str) -> None:
    app = client(tmp_path, FakeBd())
    assert app.get(path).status_code == 404
    res = app.get(path, headers=site("cross-site"))
    assert res.status_code == 403 and res.json() == REFUSED


# REQ-SERVER-012: pages outside /api are not refused
def test_server_012_frontend_not_refused(tmp_path: Path) -> None:
    res = client(tmp_path, FakeBd()).get("/beads", headers=site("cross-site"))
    assert res.status_code == 200 and "console" in res.text
