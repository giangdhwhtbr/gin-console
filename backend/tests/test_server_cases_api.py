"""API cases of the Server capability: the Beads summary per project of
`GET /api/projects/beads` (REQ-SERVER-006), read from real `.beads/issues.jsonl` files. The
endpoint starts no process, so the `gin` and workflow runners record their calls and must stay
unused."""

import subprocess
from pathlib import Path
from typing import Any

from fake_bd import FakeBd
from fake_export import bead, dep, write_export
from fastapi.testclient import TestClient
from test_cross_site import FILE, REFUSED, client, site

from gin_console.app import create_app
from gin_console.config import ProjectEntry, Settings
from gin_console.projects.models import BlockError, EpicWorkflow


class Recorder:
    """Stands in for the `gin` runners: records every call and fails if it is used."""

    def __init__(self) -> None:
        self.calls: list[Any] = []

    def __call__(self, *args: Any, **kwargs: Any) -> Any:
        self.calls.append(args)
        raise AssertionError("gin was started")


def project_beads(tmp_path: Path, rows: list[Any], recorder: Recorder | None = None) -> Any:
    """The `beads` object of project `alpha` whose export holds `rows`."""
    (tmp_path / "dist").mkdir(exist_ok=True)
    write_export(tmp_path / "alpha", rows)
    seen = recorder or Recorder()

    def workflow(path: Path, epic_id: str) -> EpicWorkflow | BlockError:
        seen(path, epic_id)
        raise AssertionError("unreachable")

    api = TestClient(
        create_app(
            Settings(projects=[ProjectEntry(name="alpha", path=tmp_path / "alpha")]),
            static_dir=tmp_path / "dist",
            run_gw=seen,
            run_bd=FakeBd(),
            run_epic_workflow=workflow,
            schedule_pulls=False,
        )
    )
    response = api.get("/api/projects/beads")
    assert response.status_code == 200
    assert seen.calls == []  # no `gin state` ran
    return response.json()[0]["beads"]


def blocked_by(ident: str, target: str, **fields: Any) -> dict[str, Any]:
    return bead(ident, dependencies=[dep(ident, target, "blocks")], **fields)


# REQ-SERVER-006 (Counts and active epics)
# TC: TC-SERVER-008@2c4dba3f
def test_tc_server_008_counts_and_active_epics(tmp_path: Path) -> None:
    rows = [
        bead("e-1", issue_type="epic", status="in_progress", title="Epic one"),
        bead("e-2", issue_type="epic", title="Epic two"),
        bead("t-1"),
        blocked_by("t-2", "t-1"),
    ]
    beads = project_beads(tmp_path, rows)
    assert (beads["open"], beads["in_progress"], beads["ready"]) == (3, 1, 2)
    assert [(e["id"], e["title"], e["status"]) for e in beads["epics"]] == [
        ("e-1", "Epic one", "in_progress"),
        ("e-2", "Epic two", "open"),
    ]


# REQ-SERVER-006 (No active epics)
# TC: TC-SERVER-009@f386b636
def test_tc_server_009_no_active_epics(tmp_path: Path) -> None:
    rows = [
        bead("e-1", issue_type="epic", status="closed"),
        bead("e-2", issue_type="epic", dependencies=[dep("e-2", "t-1", "blocks")]),
        bead("t-1"),
    ]
    assert project_beads(tmp_path, rows)["epics"] == []


# REQ-SERVER-006 (Milestone not counted as ready)
# TC: TC-SERVER-010@b5a3b21a
def test_tc_server_010_milestone_not_counted_as_ready(tmp_path: Path) -> None:
    rows = [bead("t-1"), bead("t-2"), bead("m-1", issue_type="milestone")]
    assert project_beads(tmp_path, rows)["ready"] == 2


# REQ-SERVER-006 (Prep tasks counted apart)
# TC: TC-SERVER-011@b7eabf60
def test_tc_server_011_prep_tasks_counted_apart(tmp_path: Path) -> None:
    rows = [
        bead("e-1", issue_type="epic", status="in_progress"),
        bead("t-1", dependencies=[dep("t-1", "e-1", "parent-child")]),
        bead("t-2", dependencies=[dep("t-2", "e-1", "parent-child")]),
        bead("p-1", labels=["prep", "prep:mockup"]),
        bead("p-2", status="closed", labels=["prep"]),
    ]
    beads = project_beads(tmp_path, rows)
    assert beads["open"] == 2
    assert beads["in_progress"] == 1
    assert beads["ready"] == 2
    assert beads["blocked"] == 0
    assert beads["prep"] == 1


# REQ-SERVER-006 (No workflow on epics)
# TC: TC-SERVER-015@62e24d4f
def test_tc_server_015_no_workflow_on_epics(tmp_path: Path) -> None:
    rows = [
        bead("e-1", issue_type="epic", status="in_progress"),
        bead("e-2", issue_type="epic"),
    ]
    epics = {e["id"]: e for e in project_beads(tmp_path, rows)["epics"]}
    assert epics["e-1"]["status"] == "in_progress" and not epics["e-1"].get("workflow")
    assert epics["e-2"]["status"] == "open" and not epics["e-2"].get("workflow")


# REQ-SERVER-006 (No workflow on epics): even a `gin state` that would fail is never asked
# TC: TC-SERVER-016@123feb8f
def test_tc_server_016_epics_of_any_state_carry_no_workflow(
    tmp_path: Path, monkeypatch: Any
) -> None:
    started: list[Any] = []

    def refuse(cmd: Any, *args: Any, **kwargs: Any) -> Any:
        started.append(cmd)
        return subprocess.CompletedProcess(cmd, 1, "", "boom")

    monkeypatch.setattr(subprocess, "run", refuse)
    rows = [
        bead("e-1", issue_type="epic", status="in_progress"),
        bead("e-3", issue_type="epic", status="in_progress"),
        bead("t-1"),
    ]
    beads = project_beads(tmp_path, rows)
    assert [e["id"] for e in beads["epics"]] == ["e-1", "e-3"]
    assert all("error" not in (e.get("workflow") or {}) for e in beads["epics"])
    assert all(not e.get("workflow") for e in beads["epics"])
    assert started == []
    assert beads["open"] == 1


# REQ-SERVER-006 (No workflow on epics)
# TC: TC-SERVER-017@7d290362
def test_tc_server_017_project_beads_endpoint_unchanged(tmp_path: Path) -> None:
    epic = project_beads(tmp_path, [bead("e-1", issue_type="epic", status="in_progress")])["epics"][
        0
    ]
    assert (epic["id"], epic["title"], epic["status"]) == ("e-1", "Title of e-1", "in_progress")
    assert not epic.get("workflow")


# REQ-SERVER-012 (Image from another site)
# TC: TC-SERVER-013@d3ad3ea9
def test_tc_server_013_image_from_another_site(tmp_path: Path) -> None:
    res = client(tmp_path, FakeBd()).get("/api/projects/beads", headers=site("cross-site"))
    assert res.status_code == 403 and res.json() == REFUSED


# REQ-SERVER-012 (Refresh from another site)
# TC: TC-SERVER-014@6f58d064
def test_tc_server_014_refresh_from_another_site(tmp_path: Path) -> None:
    bd = FakeBd()
    res = client(tmp_path, bd).post("/api/refresh", headers=site("cross-site"))
    assert res.status_code == 403
    assert bd.calls == []


# REQ-SERVER-012 (The console itself)
# TC: TC-SERVER-020@515623f7
def test_tc_server_020_the_console_itself(tmp_path: Path) -> None:
    res = client(tmp_path, FakeBd()).get("/api/projects/beads", headers=site("same-origin"))
    assert res.status_code == 200


# REQ-SERVER-012 (Tools)
# TC: TC-SERVER-021@292f4e4c
def test_tc_server_021_tools(tmp_path: Path) -> None:
    assert client(tmp_path, FakeBd()).get("/api/projects/beads").status_code == 200


# REQ-SERVER-012 (Mockup files)
# TC: TC-SERVER-022@3c5dde19
def test_tc_server_022_mockup_files(tmp_path: Path) -> None:
    app = client(tmp_path, FakeBd())
    res = app.get(FILE, headers=site("cross-site"))
    assert res.status_code == 200 and res.text == "body { color: red; }"
    assert app.post(FILE, headers=site("cross-site")).status_code == 403
