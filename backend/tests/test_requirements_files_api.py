import errno
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from fake_gin import FakeGin, req, trace
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.auth.passwords import hash_password
from gin_console.auth.users import User, save_users
from gin_console.config import AuthSettings, ProjectEntry, Settings
from gin_console.requirements.source import RequirementsError

DAY = "2026-11-22"
FILES = "/api/requirements/mockups/proj/files"
POLICY = "sandbox allow-scripts; connect-src 'none'; form-action 'none'; frame-src 'none'"


def write(path: Path, text: str = "x") -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return path


@pytest.fixture
def root(tmp_path: Path) -> Path:
    project = tmp_path / "proj"
    specs = project / "docs" / "specs"
    folder = specs / "ui" / "assets" / DAY
    write(folder / "description.md", f"# ui\nConfirmed: {DAY}\n")
    write(folder / "index.html", "<script>1</script>" + " " * 2000)
    write(folder / "pic.svg", "<svg xmlns='http://www.w3.org/2000/svg'/>")
    draft = specs / "ui" / "assets" / "2026-11-01"
    write(draft / "description.md", "Confirmed: no\n")
    write(draft / "index.html")
    write(specs / "ui" / "spec.md", "# spec")
    (folder / "link.html").symlink_to(write(tmp_path / "secret.html", "secret"))
    write(project / "docs" / "changes" / "open" / "01-proposal.md", "# Open\n\nEpic: e-1\n")
    old = project / "docs" / "changes" / "archive" / "2026-10-01-old"
    write(old / "proposal.md", "# Old\n")
    return project


def make(root: Path, answer: Any = None) -> TestClient:
    settings = Settings(
        projects=[
            ProjectEntry(name="proj", path=root),
            ProjectEntry(name="gone", path=root.parent / "gone"),
            ProjectEntry(name="empty", path=root.parent / "empty"),
        ]
    )
    (root.parent / "empty").mkdir()
    (root.parent / "dist").mkdir()
    app = create_app(
        settings,
        static_dir=root.parent / "dist",
        run_gin=FakeGin({"trace": trace() if answer is None else answer}),
        clock=lambda: datetime(2026, 11, 25, 3, 0, tzinfo=UTC),
    )
    return TestClient(app, raise_server_exceptions=False)


# REQ-REQUIREMENTS-007: open and archived
def test_requirements_007_list(root: Path) -> None:
    row = req(
        changes=[
            {"change": "old", "epic": None, "op": "added", "archived": "2026-10-01"},
        ]
    )
    res = make(root, trace(row)).get("/api/requirements/changes", params={"project": "proj"})
    body = res.json()
    assert [c["folder"] for c in body["changes"]] == ["open", "2026-10-01-old"]
    assert body["changes"][0]["added"] is None and body["changes"][0]["signoff"] is None
    assert body["changes"][1]["added"] == 1 and body["changes"][1]["signoff"]["state"] == "none"
    assert body["error"] is None and body["cause"] is None


# REQ-REQUIREMENTS-007: trace fails
def test_requirements_007_trace_fails(root: Path) -> None:
    client = make(root, RequirementsError("old gin", "outdated"))
    res = client.get("/api/requirements/changes", params={"project": "proj"})
    assert res.status_code == 200
    body = res.json()
    assert (body["error"], body["cause"]) == ("old gin", "outdated")
    assert len(body["changes"]) == 2 and body["changes"][0]["signoff"] is None


# REQ-REQUIREMENTS-007: no changes folder
def test_requirements_007_empty(root: Path) -> None:
    res = make(root).get("/api/requirements/changes", params={"project": "empty"})
    assert res.status_code == 200 and res.json()["changes"] == []


# REQ-REQUIREMENTS-008
def test_requirements_008_content(root: Path) -> None:
    client = make(root)
    body = client.get("/api/requirements/changes/proj/2026-10-01-old").json()
    assert body["files"] == {"proposal": "# Old\n"}
    assert (body["title"], body["epic"], body["archived"]) == ("Old", None, "2026-10-01")
    for name in ("nope", "archive", "%2e%2e", "a%00b", "..%2fopen"):
        res = client.get(f"/api/requirements/changes/proj/{name}")
        assert res.status_code == 404 and "/" not in res.text


# REQ-REQUIREMENTS-009
def test_requirements_009_list(root: Path) -> None:
    body = make(root).get("/api/requirements/mockups", params={"project": "proj"}).json()
    assert [m["date"] for m in body["mockups"]] == [DAY]
    assert body["mockups"][0]["html"] == ["index.html"]
    assert body["mockups"][0]["images"] == ["pic.svg"]


# REQ-REQUIREMENTS-007, REQ-REQUIREMENTS-008, REQ-REQUIREMENTS-009, REQ-REQUIREMENTS-010
@pytest.mark.parametrize("name", ["nope", "gone"])
def test_requirements_010_unknown_project(root: Path, name: str) -> None:
    client = make(root)
    for path in (
        f"changes?project={name}",
        f"changes/{name}/open",
        f"mockups?project={name}",
        f"mockups/{name}/files/ui/{DAY}/index.html",
    ):
        assert client.get(f"/api/requirements/{path}").status_code == 404
    assert client.get("/api/requirements/changes").status_code == 404
    assert client.get("/api/requirements/mockups").status_code == 404


# REQ-REQUIREMENTS-010: parent path, link outside, folder not confirmed, NUL byte
@pytest.mark.parametrize(
    "path",
    [
        f"ui/{DAY}/..%2f..%2fspec.md",
        f"ui/{DAY}/%2e%2e/%2e%2e/spec.md",
        f"ui/{DAY}/..%5c..%5cspec.md",
        f"ui/{DAY}/..%2f2026-11-01%2findex.html",
        f"ui/{DAY}/%252e%252e/spec.md",
        f"ui/{DAY}/link.html",
        f"ui/{DAY}/%2fetc%2fpasswd",
        f"ui/{DAY}/C:%5cWindows%5cx.html",
        f"ui/{DAY}/index.html%00",
        f"ui/{DAY}/%ff.html",
        f"ui/{DAY}/",
        f"ui/{DAY}/description.md",
        "ui/2026-11-01/index.html",
        f"ui%00/{DAY}/index.html",
        f"%2e%2e/{DAY}/index.html",
        f"..%2fspecs%2fui/{DAY}/index.html",
    ],
)
def test_requirements_010_not_found(root: Path, path: str) -> None:
    res = make(root).get(f"{FILES}/{path}")
    assert res.status_code == 404
    assert res.json() == {"detail": "Not Found"}


# REQ-REQUIREMENTS-010: read failure after the checks
def test_requirements_010_read_fails(root: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    real = Path.open

    def fail(path: Path, *args: Any, **kwargs: Any) -> Any:
        if path.name == "description.md":
            return real(path, *args, **kwargs)
        raise OSError(errno.EIO, "boom", str(root))

    client = make(root)
    monkeypatch.setattr(Path, "open", fail)
    res = client.get(f"{FILES}/ui/{DAY}/index.html")
    assert res.status_code == 404 and res.json() == {"detail": "Not Found"}


# REQ-REQUIREMENTS-010: a file above the size limit
def test_requirements_010_too_large(root: Path) -> None:
    big = write(root / "docs" / "specs" / "ui" / "assets" / DAY / "big.html")
    os.truncate(big, 20 * 1024 * 1024 + 1)
    assert make(root).get(f"{FILES}/ui/{DAY}/big.html").status_code == 404


def granted(root: Path) -> tuple[TestClient, str]:
    """An app with auth on, and the grant path of a user allowed `proj`, without a cookie."""
    users_file = root.parent / "users.yaml"
    an = User(name="an", email="an@x.io", password_hash=hash_password("P"), projects=["proj"])
    save_users(users_file, [an])
    settings = Settings(
        projects=[ProjectEntry(name="proj", path=root)],
        auth=AuthSettings(enabled=True, users_file=users_file),
    )
    client = TestClient(create_app(settings, run_gin=FakeGin({}), schedule_pulls=False))
    grant = client.post("/api/auth/login", json={"username": "an", "password": "P"}).json()[
        "mockup_grant"
    ]
    client.cookies.clear()
    return client, f"/api/requirements/mockups/proj/g/{grant}/files"


# REQ-REQUIREMENTS-010: Grant path
def test_requirements_010_grant_path(root: Path) -> None:
    client, files = granted(root)
    res = client.get(f"{files}/ui/{DAY}/index.html")
    assert res.status_code == 200 and "<script>1</script>" in res.text
    assert res.headers["content-security-policy"] == POLICY
    assert res.headers["x-content-type-options"] == "nosniff"
    for path in (
        f"ui/{DAY}/..%2f..%2fspec.md",
        f"ui/{DAY}/link.html",
        "ui/2026-11-01/index.html",
        f"ui/{DAY}/index.html%00",
        f"ui/{DAY}/description.md",
    ):
        res = client.get(f"{files}/{path}")
        assert res.status_code == 404 and res.json() == {"detail": "Not Found"}


# REQ-REQUIREMENTS-011: HTML, also for a range request, and SVG
@pytest.mark.parametrize(
    ("name", "media"), [("index.html", "text/html; charset=utf-8"), ("pic.svg", "image/svg+xml")]
)
@pytest.mark.parametrize("headers", [{}, {"Range": "bytes=999999-"}, {"Range": "nonsense"}])
def test_requirements_011_headers(
    root: Path, name: str, media: str, headers: dict[str, str]
) -> None:
    res = make(root).get(f"{FILES}/ui/{DAY}/{name}", headers=headers)
    assert res.status_code == 200
    assert res.headers["content-security-policy"] == POLICY
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["content-type"] == media


# REQ-REQUIREMENTS-011: an inline script is delivered unchanged
def test_requirements_011_interactive(root: Path) -> None:
    assert "<script>1</script>" in make(root).get(f"{FILES}/ui/{DAY}/index.html").text
