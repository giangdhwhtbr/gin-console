from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fake_bd import FakeBd
from fake_export import bead, write_export
from fake_gw import FakeGw
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.config import OverviewSettings, ProjectEntry, Settings

NOW = datetime(2026, 11, 20, 12, 0, tzinfo=UTC)


def make(
    tmp_path: Path, names: list[str], aging_days: int = 3
) -> tuple[TestClient, FakeGw, FakeBd]:
    (tmp_path / "dist").mkdir(exist_ok=True)
    gw, bd = FakeGw(), FakeBd()

    def no_workflow(cwd: Path, epic: str) -> Any:
        raise AssertionError("the overview must not read a workflow")

    settings = Settings(
        projects=[ProjectEntry(name=n, path=tmp_path / n) for n in names],
        overview=OverviewSettings(aging_days=aging_days),
    )
    app = create_app(
        settings,
        static_dir=tmp_path / "dist",
        run_gw=gw,
        run_bd=bd,
        run_epic_workflow=no_workflow,
        clock=lambda: NOW,
        schedule_pulls=False,
    )
    return TestClient(app), gw, bd


# REQ-OVERVIEW-001
def test_overview_001_no_process_and_config_order(tmp_path: Path) -> None:
    for name in ("zeta", "alpha"):
        write_export(tmp_path / name, [bead(f"{name}-1", assignee="ann")])
    api, gw, bd = make(tmp_path, ["zeta", "alpha"])
    response = api.get("/api/overview")
    assert response.status_code == 200
    body = response.json()
    assert [p["name"] for p in body["projects"]] == ["zeta", "alpha"]
    assert body["projects"][0]["error"] is None
    assert body["generated_at"].startswith("2026-11-20T12:00:00")
    assert gw.calls == [] and bd.calls == []


# REQ-OVERVIEW-001
def test_overview_001_one_project_unreadable(tmp_path: Path) -> None:
    (tmp_path / "a").mkdir()
    write_export(tmp_path / "b", [bead("b-1")])
    api, _, _ = make(tmp_path, ["a", "b"])
    a, b = api.get("/api/overview").json()["projects"]
    assert a["error"]
    assert b["error"] is None and [x["id"] for x in b["unassigned"]] == ["b-1"]


# REQ-OVERVIEW-001
def test_overview_001_missing_directory(tmp_path: Path) -> None:
    api, _, _ = make(tmp_path, ["gone"])
    [project] = api.get("/api/overview").json()["projects"]
    assert "does not exist" in project["error"]


# REQ-OVERVIEW-001
def test_overview_001_no_projects(tmp_path: Path) -> None:
    api, _, _ = make(tmp_path, [])
    assert api.get("/api/overview").json()["projects"] == []


# REQ-OVERVIEW-001
def test_overview_001_stale_when_the_store_changed(tmp_path: Path) -> None:
    write_export(tmp_path / "a", [bead("a-1")])
    manifest = tmp_path / "a/.beads/embeddeddolt/db/.dolt/noms/manifest"
    manifest.parent.mkdir(parents=True)
    manifest.write_bytes(b"root-1")
    api, _, _ = make(tmp_path, ["a"])
    assert api.get("/api/overview").json()["projects"][0]["stale"] is False
    manifest.write_bytes(b"root-2")
    assert api.get("/api/overview").json()["projects"][0]["stale"] is True


# REQ-CONFIG-007
def test_config_007_aging_days_reaches_the_response(tmp_path: Path) -> None:
    api, _, _ = make(tmp_path, [], aging_days=5)
    assert api.get("/api/overview").json()["aging_days"] == 5
