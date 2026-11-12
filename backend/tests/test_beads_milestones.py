import subprocess
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from fake_export import FakeExport, bead, dep, write_export
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.beads.source import BeadsError
from gin_console.config import ProjectEntry, Settings


class Clock:
    def __init__(self) -> None:
        self.now = datetime(2026, 11, 12, 12, 0, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.now


def make(tmp_path: Path, fake: Any) -> TestClient:
    (tmp_path / "proj").mkdir(exist_ok=True)
    (tmp_path / "dist").mkdir(exist_ok=True)
    write_export(tmp_path / "proj", [])
    settings = Settings(projects=[ProjectEntry(name="proj", path=tmp_path / "proj")])
    app = create_app(
        settings,
        static_dir=tmp_path / "dist",
        claude_home=tmp_path,
        read_beads=fake,
        clock=Clock(),
    )
    return TestClient(app, raise_server_exceptions=False)


def ms(ident: str, status: str = "open", **meta: str) -> dict[str, Any]:
    return bead(ident, issue_type="milestone", status=status, metadata=meta)


def get(api: TestClient) -> dict[str, Any]:
    response = api.get("/api/beads/milestones", params={"project": "proj"})
    assert response.status_code == 200
    body: dict[str, Any] = response.json()
    return body


def statuses(body: dict[str, Any]) -> dict[str, str]:
    return {m["id"]: m["status"] for m in body["milestones"]}


# REQ-BEADS-015
def test_beads_015_current_milestone(tmp_path: Path) -> None:
    rows = [
        ms("m1", "closed", start="2026-09-01", end="2026-09-30", kickoff="2026-09-01"),
        ms("m2", start="2026-11-02", end="2026-11-27", kickoff="2026-11-02"),
        ms("m3", start="2026-12-01", end="2026-12-20"),
    ]
    body = get(make(tmp_path, FakeExport(rows)))
    assert statuses(body) == {"m1": "closed", "m2": "active", "m3": "planned"}
    assert body["current"] == "m2"
    assert body["milestones"][1] == {
        "id": "m2",
        "title": "Title of m2",
        "status": "active",
        "start": "2026-11-02",
        "end": "2026-11-27",
    }


# REQ-BEADS-015
def test_beads_015_period_holds_today(tmp_path: Path) -> None:
    body = get(make(tmp_path, FakeExport([ms("m4", start="2026-11-02", end="2026-11-27")])))
    assert body["current"] == "m4"


# REQ-BEADS-015
def test_beads_015_no_open_milestone(tmp_path: Path) -> None:
    rows = [ms("m1", "closed", start="2026-09-01", end="2026-09-30")]
    assert get(make(tmp_path, FakeExport(rows)))["current"] is None


# REQ-BEADS-015
def test_beads_015_undated(tmp_path: Path) -> None:
    rows = [
        ms("m5", start="2026-11-02", kickoff="2026-11-02"),
        ms("m6", start="2026-13-45", end="2026-11-30"),
    ]
    body = get(make(tmp_path, FakeExport(rows)))
    by_id = {m["id"]: m for m in body["milestones"]}
    assert by_id["m5"]["end"] is None and by_id["m5"]["start"] == "2026-11-02"
    assert by_id["m6"]["start"] is None
    assert body["current"] is None


# REQ-BEADS-015
def test_beads_015_bad_input(tmp_path: Path) -> None:
    api = make(tmp_path, FakeExport([]))
    assert api.get("/api/beads/milestones", params={"project": "nope"}).status_code == 404
    failing = make(tmp_path, FakeExport(failure=BeadsError("boom")))
    response = failing.get("/api/beads/milestones", params={"project": "proj"})
    assert response.status_code == 502 and response.json() == {"error": "boom"}


# REQ-BEADS-015
def test_beads_015_no_process(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    def refuse(*args: Any, **kwargs: Any) -> None:
        raise AssertionError("a process was started")

    monkeypatch.setattr(subprocess, "run", refuse)
    monkeypatch.setattr(subprocess, "Popen", refuse)
    api = make(tmp_path, FakeExport([ms("m4", start="2026-11-02", end="2026-11-27")]))
    assert api.get("/api/beads/milestones", params={"project": "proj"}).status_code == 200


# REQ-BEADS-001
def test_beads_001_milestone_of_a_bead(tmp_path: Path) -> None:
    rows = [
        ms("m2", start="2026-11-02", end="2026-11-27"),
        bead(
            "e1", issue_type="epic", status="closed", dependencies=[dep("e1", "m2", "parent-child")]
        ),
        bead("e1.1", dependencies=[dep("e1.1", "e1", "parent-child")]),
        bead("t9"),
    ]
    api = make(tmp_path, FakeExport(rows))
    got = {
        b["id"]: b["milestone"] for b in api.get("/api/beads", params={"project": "proj"}).json()
    }
    assert got == {"m2": "m2", "e1.1": "m2", "t9": None}
    closed = api.get("/api/beads", params={"project": "proj", "closed": "1"}).json()
    assert {b["id"]: b["milestone"] for b in closed}["e1"] == "m2"


# REQ-BEADS-001
def test_beads_001_parent_cycle(tmp_path: Path) -> None:
    rows = [
        bead("a", dependencies=[dep("a", "b", "parent-child")]),
        bead("b", dependencies=[dep("b", "a", "parent-child")]),
    ]
    response = make(tmp_path, FakeExport(rows)).get("/api/beads", params={"project": "proj"})
    assert response.status_code == 200
    assert [b["milestone"] for b in response.json()] == [None, None]
