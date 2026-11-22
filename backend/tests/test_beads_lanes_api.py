"""The lane, track, claim and merge gate fields over HTTP (REQ-BEADS-019, REQ-BEADS-007) and the
places that leave merge gates out (REQ-SERVER-006, REQ-REPORTS-001, REQ-REPORTS-009)."""

import json
import subprocess
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from fake_bd import FakeBd
from fake_export import FakeExport, bead, dep, write_export
from fakes import Fake
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.beads.source import read_export
from gin_console.config import ProjectEntry, Settings

PLAN = ".planning/plans/2026-11-20-shop.md"
WAITS_FOR_BE_2 = {"plan": PLAN, "number": 2, "track_id": "e-1.2", "lane": "be"}
NOW = datetime(2026, 11, 12, 12, 0, tzinfo=UTC)


def make(tmp_path: Path, rows: list[dict[str, Any]]) -> TestClient:
    """An app over project `alpha` whose beads are `rows`."""
    (tmp_path / "dist").mkdir(exist_ok=True)
    write_export(tmp_path / "alpha", [])  # an export file, so the snapshot is kept until it changes
    app = create_app(
        Settings(projects=[ProjectEntry(name="alpha", path=tmp_path / "alpha")]),
        static_dir=tmp_path / "dist",
        read_beads=FakeExport(rows) if rows else read_export,
        run_bd=FakeBd(),
        clock=lambda: NOW,
    )
    return TestClient(app, raise_server_exceptions=False)


def listed(api: TestClient) -> dict[str, Any]:
    response = api.get("/api/beads", params={"project": "alpha", "closed": "1"})
    assert response.status_code == 200
    return {b["id"]: b for b in response.json()}


def gate(ident: str, plan: str, number: int, **fields: Any) -> dict[str, Any]:
    return bead(ident, title=f"external: {plan}#{number}", **fields)


# REQ-BEADS-019
# TC: TC-BEADS-060@994e88a5
def test_tc_beads_060_track_of_a_lane(tmp_path: Path) -> None:
    claim = {"holder": "ann@x.io", "expires_at": "2026-11-20T16:00:00Z"}
    row = bead(
        "t-1",
        description=f"Intro\nPlan: {PLAN}, Track 2\nLane: be\n",
        labels=["lane:be", "track:2"],
        metadata={"claim": claim},
    )
    found = listed(make(tmp_path, [row]))["t-1"]
    assert found["lane"] == "be"
    assert found["track"] == {"plan": PLAN, "number": 2}
    assert found["claim"] == claim


# REQ-BEADS-019
# TC: TC-BEADS-061@ba991e9b
def test_tc_beads_061_labels_only(tmp_path: Path) -> None:
    found = listed(make(tmp_path, [bead("t-1", labels=["lane:fe", "track:3"])]))["t-1"]
    assert found["lane"] == "fe"
    assert found["track"] == {"plan": None, "number": 3}


# REQ-BEADS-019
# TC: TC-BEADS-062@0bd0166f
def test_tc_beads_062_claim_as_a_json_string(tmp_path: Path) -> None:
    claim = {"holder": "bao@x.io", "expires_at": "2026-11-21T09:00:00Z"}
    rows = [
        bead("a-1", metadata={"claim": json.dumps(claim)}),
        bead("a-2", metadata={"claim": "soon"}),
    ]
    by_id = listed(make(tmp_path, rows))
    assert by_id["a-1"]["claim"] == claim
    assert by_id["a-2"]["claim"] is None


# REQ-BEADS-019
# TC: TC-BEADS-063@decce715
def test_tc_beads_063_not_a_lane_name(tmp_path: Path) -> None:
    found = listed(make(tmp_path, [bead("t-1", description="Lane: Back End")]))["t-1"]
    assert found["lane"] is None


def tracks_and_gate(gate_row: dict[str, Any]) -> list[dict[str, Any]]:
    """Epic e-1 with track e-1.2 (lane be) and track e-1.4, which `gate_row` blocks."""
    return [
        bead("e-1", issue_type="epic"),
        bead(
            "e-1.2",
            parent="e-1",
            description=f"Plan: {PLAN}, Track 2\nLane: be",
            dependencies=[dep("e-1.2", "e-1", "parent-child")],
        ),
        bead(
            "e-1.4",
            parent="e-1",
            description=f"Plan: {PLAN}, Track 4\nLane: qa",
            dependencies=[
                dep("e-1.4", "e-1", "parent-child"),
                dep("e-1.4", gate_row["id"], "blocks"),
            ],
        ),
        gate_row,
    ]


# REQ-BEADS-019
# TC: TC-BEADS-064@6507d2fb
def test_tc_beads_064_merge_gate(tmp_path: Path) -> None:
    by_id = listed(make(tmp_path, tracks_and_gate(gate("g-1", PLAN, 2))))
    assert by_id["g-1"]["waits_for"] == {
        "plan": PLAN,
        "number": 2,
        "track_id": "e-1.2",
        "lane": "be",
    }
    assert all(b["waits_for"] is None for ident, b in by_id.items() if ident != "g-1")


# REQ-BEADS-019
# TC: TC-BEADS-065@e12c0ed9
def test_tc_beads_065_track_not_found(tmp_path: Path) -> None:
    other = ".planning/plans/other.md"
    rows = [
        bead("e-1", issue_type="epic"),
        gate("g-2", other, 7, parent="e-1", dependencies=[dep("g-2", "e-1", "parent-child")]),
    ]
    found = listed(make(tmp_path, rows))["g-2"]
    assert found["waits_for"] == {"plan": other, "number": 7, "track_id": None, "lane": None}


# REQ-BEADS-019
# TC: TC-BEADS-066@bdd681b3
def test_tc_beads_066_gate_in_the_relations(tmp_path: Path) -> None:
    api = make(tmp_path, tracks_and_gate(gate("g-1", PLAN, 2)))
    response = api.get("/api/beads/alpha/e-1.4")
    assert response.status_code == 200
    blockers = [d for d in response.json()["dependencies"] if d["id"] == "g-1"]
    assert len(blockers) == 1
    assert blockers[0]["waits_for"] == {
        "plan": PLAN,
        "number": 2,
        "track_id": "e-1.2",
        "lane": "be",
    }


# REQ-BEADS-007
# TC: TC-BEADS-067@a5336589
def test_tc_beads_067_merge_gate_is_never_ready(tmp_path: Path) -> None:
    found = listed(make(tmp_path, [gate("g-1", ".planning/plans/p.md", 2)]))["g-1"]
    assert found["ready"] is False
    assert found["blocked"] is False


# REQ-SERVER-006
# TC: TC-SERVER-018@d3670478
def test_tc_server_018_merge_gates_not_counted(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(subprocess, "run", Fake())  # gin state
    rows = [bead("t-1"), bead("t-2"), gate("g-1", ".planning/plans/p.md", 1)]
    api = make(tmp_path, rows)
    project = next(p for p in api.get("/api/projects").json() if p["name"] == "alpha")
    assert project["beads"]["open"] == 2
    assert project["beads"]["ready"] == 2


def closed_days_ago(ident: str, days: int, **fields: Any) -> dict[str, Any]:
    at = (NOW - timedelta(days=days)).isoformat()
    return bead(ident, status="closed", closed_at=at, **fields)


def gate_closed(ident: str, days: int) -> dict[str, Any]:
    return closed_days_ago(ident, days, title="external: .planning/plans/p.md#2")


# REQ-REPORTS-001
# TC: TC-REPORTS-057@e48f97b5
def test_tc_reports_057_merge_gates_left_out(tmp_path: Path) -> None:
    rows = [closed_days_ago("t-1", 3), gate_closed("g-1", 3)]
    body = make(tmp_path, rows).get("/api/reports", params={"project": "alpha"}).json()
    assert body["totals"]["closed"] == 1
    listed_ids = json.dumps(body)
    assert "g-1" not in listed_ids and "external:" not in listed_ids


# REQ-REPORTS-009
# TC: TC-REPORTS-058@6386a4eb
def test_tc_reports_058_merge_gates_left_out_of_the_team_scope(tmp_path: Path) -> None:
    rows = [
        bead("m2", issue_type="milestone", metadata={"start": "2026-11-02", "end": "2026-11-27"}),
        bead("e-1", issue_type="epic", parent="m2"),
        bead("t-1", parent="e-1", assignee="ann"),
        gate("g-1", ".planning/plans/p.md", 1, parent="e-1"),
        bead("e-2", issue_type="epic", parent="m2"),
        gate("g-2", ".planning/plans/p.md", 2, parent="e-2"),
    ]
    body = (
        make(tmp_path, rows)
        .get("/api/reports/team", params={"project": "alpha", "milestone": "m2"})
        .json()
    )
    by_id = {b["id"]: b for b in body["beads"]}
    assert set(by_id) == {"t-1", "e-2"}
    assert by_id["e-2"]["epic"]["id"] == "e-2"
