import os
import subprocess
from pathlib import Path
from typing import Any

import pytest
from fake_bd import FakeBd
from fake_export import write_export
from fake_git import FakeGit
from fakes import ISSUES
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.beads.attachments import GitRun
from gin_console.beads.pull import FETCH_ARGS
from gin_console.config import ProjectEntry, Settings


def client(tmp_path: Path, *projects: tuple[str, Path]) -> TestClient:
    settings = Settings(projects=[ProjectEntry(name=n, path=p) for n, p in projects])
    return TestClient(create_app(settings, static_dir=tmp_path / "static"))


def project_dir(tmp_path: Path, name: str) -> Path:
    path = tmp_path / name
    path.mkdir()
    return path


# REQ-SERVER-010
def test_server_010_summary_per_project(tmp_path: Path) -> None:
    alpha = project_dir(tmp_path, "alpha")
    write_export(alpha, ISSUES)
    response = client(tmp_path, ("alpha", alpha), ("gone", tmp_path / "gone")).get(
        "/api/projects/beads"
    )
    assert response.status_code == 200
    body = response.json()
    assert [p["name"] for p in body] == ["alpha", "gone"]
    assert body[0]["exists"] is True
    assert body[0]["beads"]["open"] == 3
    assert body[0]["beads"]["stale"] is False
    assert body[1]["exists"] is False and body[1]["beads"] is None
    assert all("workflow" not in p for p in body)
    assert [p["pull"] for p in body] == [None, None]  # REQ-BEADS-016: not pulled since start


# REQ-SERVER-010
def test_server_010_no_process(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    def refuse(*args: Any, **kwargs: Any) -> None:
        raise AssertionError("a process was started")

    monkeypatch.setattr(subprocess, "run", refuse)
    monkeypatch.setattr(subprocess, "Popen", refuse)
    one, two = project_dir(tmp_path, "one"), project_dir(tmp_path, "two")
    write_export(one, ISSUES)
    write_export(two, ISSUES)
    api = client(tmp_path, ("one", one), ("two", two))
    assert api.get("/api/projects/beads").status_code == 200


# REQ-SERVER-010
def test_server_010_unreadable_beads(tmp_path: Path) -> None:
    alpha, beta = project_dir(tmp_path, "alpha"), project_dir(tmp_path, "beta")
    write_export(beta, ISSUES)
    body = client(tmp_path, ("alpha", alpha), ("beta", beta)).get("/api/projects/beads").json()
    assert ".beads/issues.jsonl" in body[0]["beads"]["error"]
    assert set(body[0]["beads"]) == {"error"}
    assert body[1]["beads"]["open"] == 3


# REQ-SERVER-010
def test_server_010_no_projects(tmp_path: Path) -> None:
    response = client(tmp_path).get("/api/projects/beads")
    assert response.status_code == 200 and response.json() == []


# REQ-BEADS-013 (Project beads without reuse)
def test_beads_013_project_beads_without_reuse(tmp_path: Path) -> None:
    alpha = project_dir(tmp_path, "alpha")
    noms = alpha / ".beads" / "embeddeddolt" / "db" / ".dolt" / "noms"
    noms.mkdir(parents=True)
    (noms / "manifest").write_bytes(b"root-1")
    exported = write_export(alpha, ISSUES)
    os.utime(exported, ns=(1_000_000_000, 1_000_000_000))
    api = client(tmp_path, ("alpha", alpha))
    assert api.get("/api/projects/beads").json()[0]["beads"]["stale"] is False
    (noms / "manifest").write_bytes(b"root-2")  # a bd write that was not exported
    assert api.get("/api/projects/beads").json()[0]["beads"]["stale"] is True


# REQ-SERVER-006 (Project beads endpoint unchanged)
def test_server_006_project_beads_epics_have_status_and_no_workflow(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    def refuse(*args: Any, **kwargs: Any) -> None:
        raise AssertionError("a gin process was started")

    monkeypatch.setattr(subprocess, "run", refuse)
    alpha = project_dir(tmp_path, "alpha")
    write_export(alpha, ISSUES)
    body = client(tmp_path, ("alpha", alpha)).get("/api/projects/beads").json()
    epics = body[0]["beads"]["epics"]
    assert epics[0]["id"] == "e1" and epics[0]["status"] == "in_progress"
    assert all(not e.get("workflow") for e in epics)


# REQ-BEADS-033: attachments_fetch is null before a pull and for pull: false, the result after
def test_beads_033_attachments_fetch_in_the_summary(tmp_path: Path) -> None:
    alpha, beta = project_dir(tmp_path, "alpha"), project_dir(tmp_path, "beta")
    for path in (alpha, beta):
        write_export(path, ISSUES)
    git = FakeGit({(alpha, FETCH_ARGS): GitRun(0, b"", "")})
    settings = Settings(
        projects=[
            ProjectEntry(name="alpha", path=alpha),
            ProjectEntry(name="beta", path=beta, pull=False),
        ]
    )
    api = TestClient(
        create_app(settings, static_dir=tmp_path / "static", run_bd=FakeBd(), run_git=git)
    )
    assert [p["attachments_fetch"] for p in api.get("/api/projects/beads").json()] == [None, None]
    assert api.post("/api/refresh").status_code == 204
    alpha_body, beta_body = api.get("/api/projects/beads").json()
    assert alpha_body["attachments_fetch"]["status"] == "ok"
    assert alpha_body["attachments_fetch"]["error"] is None
    assert alpha_body["attachments_fetch"]["at"]
    assert beta_body["attachments_fetch"] is None
    assert git.calls == [(alpha, FETCH_ARGS)]
