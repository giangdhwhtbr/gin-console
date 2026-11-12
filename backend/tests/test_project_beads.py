import os
import subprocess
from pathlib import Path
from typing import Any

import pytest
from fake_export import write_export
from fakes import ISSUES
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.config import ProjectEntry, Settings


def client(tmp_path: Path, *projects: tuple[str, Path]) -> TestClient:
    settings = Settings(projects=[ProjectEntry(name=n, path=p) for n, p in projects])
    return TestClient(create_app(settings, static_dir=tmp_path / "static", claude_home=tmp_path))


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
