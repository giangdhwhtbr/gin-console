from pathlib import Path
from typing import Any

from fake_bd import FakeBd
from fake_export import bead, dep, write_export
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.config import ProjectEntry, Settings


def client(tmp_path: Path, name: str, rows: list[Any]) -> TestClient:
    """An app over one project `name` whose `.beads/issues.jsonl` holds `rows`."""
    (tmp_path / "dist").mkdir(exist_ok=True)
    write_export(tmp_path / name, rows)
    settings = Settings(projects=[ProjectEntry(name=name, path=tmp_path / name)])
    return TestClient(
        create_app(settings, static_dir=tmp_path / "dist", run_bd=FakeBd()),
        raise_server_exceptions=False,
    )


NO_STATES = {"in_progress": 0, "blocked": 0, "ready": 0, "deferred": 0}
READY_ONE = {**NO_STATES, "ready": 1}


def blocked_by(ident: str, target: str, **fields: Any) -> dict[str, Any]:
    return bead(ident, dependencies=[dep(ident, target, "blocks")], **fields)


def child(ident: str, parent: str, **fields: Any) -> dict[str, Any]:
    return bead(ident, dependencies=[dep(ident, parent, "parent-child")], **fields)


def epic_with_tracks() -> list[Any]:
    return [
        bead("e-1", issue_type="epic"),
        child("t-1", "e-1", status="closed"),
        child("t-2", "e-1", status="closed"),
        child("t-3", "e-1"),
        child("p-1", "e-1", status="closed", labels=["prep"]),
        child("g-1", "e-1", title="external: .planning/plans/p.md#1"),
    ]


def project_beads(api: TestClient, name: str) -> dict[str, Any]:
    body = next(p for p in api.get("/api/projects").json() if p["name"] == name)
    result: dict[str, Any] = body["beads"]
    return result


# TC: TC-BEADS-071@d89f42bf
def test_tc_beads_071_blocked_whatever_the_status(tmp_path: Path) -> None:
    rows = [
        bead("a"),
        blocked_by("e", "a", issue_type="epic"),
        child("e.1", "e"),
        bead("b", status="blocked"),
        blocked_by("c", "a", status="in_progress"),
        bead("d", status="in_progress"),
    ]
    counts = project_beads(client(tmp_path, "alpha", rows), "alpha")
    assert counts["blocked"] == 4
    assert counts["in_progress"] == 1


# TC: TC-BEADS-074@ec7c8dc1
def test_tc_beads_074_counts_ignore_the_closed_filter(tmp_path: Path) -> None:
    api = client(tmp_path, "alpha", epic_with_tracks())
    want = {**READY_ONE, "total": 3, "closed": 2, "prep_total": 1, "prep_closed": 1}
    first = api.get("/api/beads", params={"project": "alpha"}).json()
    ids = {b["id"] for b in first}
    assert not ids & {"t-1", "t-2", "p-1"}
    assert {"e-1", "t-3"} <= ids
    assert next(b for b in first if b["id"] == "e-1")["child_counts"] == want
    second = api.get("/api/beads", params={"project": "alpha", "closed": "1"}).json()
    assert next(b for b in second if b["id"] == "e-1")["child_counts"] == want
    # the merge gate g-1 is in the export but counts for nothing: total 3 is t-1, t-2 and t-3
    assert "g-1" in {b["id"] for b in second}


# TC: TC-BEADS-075@3ae542a2
def test_tc_beads_075_bead_without_children(tmp_path: Path) -> None:
    api = client(tmp_path, "alpha", [bead("t-9")])
    body = api.get("/api/beads/alpha/t-9").json()
    zero = {"total": 0, "closed": 0, "prep_total": 0, "prep_closed": 0}
    assert body["child_counts"] == {**NO_STATES, **zero}


# TC: TC-BEADS-076@18360c09
def test_tc_beads_076_child_counts_in_the_bead_detail(tmp_path: Path) -> None:
    api = client(tmp_path, "alpha", epic_with_tracks())
    body = api.get("/api/beads/alpha/e-1").json()
    assert body["child_counts"] == {
        **READY_ONE,
        "total": 3,
        "closed": 2,
        "prep_total": 1,
        "prep_closed": 1,
    }
    assert body["status"] == "open"  # not done although 2 of 3 tracks are closed


# TC: TC-BEADS-078@2a550353
def test_tc_beads_078_same_handle_at_two_domains(tmp_path: Path) -> None:
    rows = [
        bead(
            "m1",
            issue_type="milestone",
            metadata={"start": "2026-11-02", "end": "2026-11-27"},
        ),
        bead("e1", issue_type="epic", parent="m1"),
        child("t1", "e1", assignee="ann@a.example"),
        child("t2", "e1", assignee="ann@b.example"),
    ]
    api = client(tmp_path, "example", rows)
    body = api.get("/api/reports/team", params={"project": "example", "milestone": "m1"}).json()
    assert [(m["member"], m["scope"]) for m in body["members"]] == [("ann", 2)]


# TC: TC-REPORTS-059@6a64fdc6
def test_tc_reports_059_blocked_whatever_the_status(tmp_path: Path) -> None:
    rows = [
        bead("x"),
        bead("m2", issue_type="milestone", metadata={"start": "2026-11-02", "end": "2026-11-27"}),
        bead("e1", issue_type="epic", parent="m2"),
        child("e1.1", "e1", status="blocked"),
        blocked_by("e1.2", "x", parent="e1"),
        blocked_by("e1.3", "x", parent="e1", status="in_progress"),
        child("e1.4", "e1", status="in_progress"),
    ]
    api = client(tmp_path, "alpha", rows)
    team = api.get("/api/reports/team", params={"project": "alpha", "milestone": "m2"}).json()[
        "team"
    ]
    assert team["blocked"] == 3
    assert team["in_progress"] == 1
    assert team["open"] == 3


# TC: TC-SERVER-019@0f512e28
def test_tc_server_019_blocked_whatever_the_status(tmp_path: Path) -> None:
    rows = [
        bead("x"),
        bead("b", status="blocked"),
        blocked_by("c", "x", status="in_progress"),
        bead("d", status="in_progress"),
    ]
    counts = project_beads(client(tmp_path, "alpha", rows), "alpha")
    assert counts["blocked"] == 2
    assert counts["in_progress"] == 1


# REQ-BEADS-022
def test_beads_022_counts_by_state_in_the_list(tmp_path: Path) -> None:
    rows = [
        bead("x"),
        bead("e-2", issue_type="epic"),
        child("t-1", "e-2", status="closed"),
        child("t-2", "e-2", status="in_progress"),
        bead(
            "t-3",
            status="in_progress",
            dependencies=[dep("t-3", "e-2", "parent-child"), dep("t-3", "x", "blocks")],
        ),
        child("t-4", "e-2"),
        child("t-5", "e-2", status="deferred"),
        child("t-6", "e-2", status="hooked"),
    ]
    body = client(tmp_path, "alpha", rows).get("/api/beads", params={"project": "alpha"}).json()
    counts = next(b for b in body if b["id"] == "e-2")["child_counts"]
    assert counts == {
        "total": 6,
        "closed": 1,
        "prep_total": 0,
        "prep_closed": 0,
        "in_progress": 2,
        "blocked": 1,
        "ready": 1,
        "deferred": 1,
    }
