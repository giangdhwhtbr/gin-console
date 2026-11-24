"""API cases for the Reports status and Team KPI v2 endpoints (REQ-REPORTS-020 to 026, 034, 035)."""

import json
import subprocess
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from fake_bd import FakeBd
from fake_export import FakeExport, bead, dep, write_export
from fake_gw import FakeGw
from fakes import Fake
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.beads.source import BeadsError
from gin_console.config import ProjectEntry, Settings


class Clock:
    def __init__(self, now: datetime | None = None) -> None:
        self.now = now or datetime(2026, 11, 23, 12, 0, tzinfo=UTC)  # Monday

    def __call__(self) -> datetime:
        return self.now


class Runners:
    def __init__(self) -> None:
        self.bd = FakeBd()
        self.gw = FakeGw()

    def calls(self) -> int:
        return len(self.bd.calls) + len(self.gw.calls)


def make(
    tmp_path: Path,
    exports: dict[str, Any],
    clock: Clock | None = None,
    runners: Runners | None = None,
) -> TestClient:
    (tmp_path / "dist").mkdir(exist_ok=True)
    for name in exports:
        write_export(tmp_path / name, [])
    settings = Settings(
        projects=[ProjectEntry(name=name, path=tmp_path / name) for name in exports]
    )
    held = runners or Runners()
    app = create_app(
        settings,
        static_dir=tmp_path / "dist",
        read_beads=lambda cwd: exports[cwd.name](cwd),
        run_gw=held.gw,
        run_bd=held.bd,
        clock=clock or Clock(),
    )
    return TestClient(app, raise_server_exceptions=False)


def milestone(ident: str, start: str, end: str, **fields: Any) -> dict[str, Any]:
    meta = {"start": start, "end": end, **fields.pop("meta", {})}
    return bead(ident, issue_type="milestone", metadata=meta, **fields)


def write_reopens(project: Path, entries: list[tuple[str, str]]) -> None:
    log = project / ".beads" / "interactions.jsonl"
    log.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        json.dumps(
            {
                "kind": "field_change",
                "issue_id": issue_id,
                "created_at": at,
                "extra": {"field": "status", "old_value": "closed", "new_value": "open"},
            }
        )
        for issue_id, at in entries
    ]
    log.write_text("\n".join(lines) + "\n", encoding="utf-8")


# REQ-REPORTS-020
# TC: TC-REPORTS-073@363477c6
def test_tc_reports_073_status_default_milestone_period_and_cache(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    fake_proc = Fake()
    monkeypatch.setattr(subprocess, "run", fake_proc)
    clock = Clock()
    runners = Runners()
    recent = "2026-11-18T10:00:00Z"
    beads = [
        milestone(
            "m1", "2026-10-01", "2026-10-15", status="closed", closed_at="2026-10-15T12:00:00Z"
        ),
        milestone("m2", "2026-11-09", "2026-12-02", meta={"kickoff": "2026-11-11"}),
        milestone("m3", "2026-12-07", "2026-12-31"),
        bead(
            "e-1",
            issue_type="epic",
            parent="m2",
            created_at="2026-11-02T10:00:00Z",
            metadata={"points": 5},
        ),
        *[bead(f"c-{i}", parent="e-1", status="closed", closed_at=recent) for i in range(5)],
    ]
    api = make(tmp_path, {"alpha": FakeExport(beads)}, clock, runners)
    write_reopens(tmp_path / "alpha", [("c-0", "2026-11-19T10:00:00Z")])

    r1 = api.get("/api/reports/status", params={"project": "alpha"})
    assert r1.status_code == 200
    body1 = r1.json()
    assert (body1["milestone"], body1["days"]) == ("m2", None)
    assert body1["period"]["kickoff"] == "2026-11-11"
    assert body1["kpis"]["beads"]["scope"] == 5
    assert len(body1["burnup"]) > 0
    assert [e["id"] for e in body1["epics"]] == ["e-1"]

    clock.now += timedelta(seconds=20)
    r2 = api.get("/api/reports/status", params={"project": "alpha"})
    assert r2.status_code == 200
    assert r2.json()["generated_at"] == body1["generated_at"]
    assert fake_proc.calls == [] and runners.calls() == 0

    r3 = api.get("/api/reports/status", params={"project": "alpha", "days": "30"})
    assert r3.status_code == 200
    body3 = r3.json()
    assert (body3["milestone"], body3["period"], body3["days"]) == (None, None, 30)
    assert body3["kpis"]["beads"]["done"] == 5
    assert body3["kpis"]["rework"]["rate"] == 0.2
    assert (body3["burnup"], body3["changes"]["items"], body3["epics"]) == ([], [], [])
    assert body3["risks"] == {"blocked": [], "blocked_more": 0, "unestimated": []}


# REQ-REPORTS-020
# TC: TC-REPORTS-074@64825c75
def test_tc_reports_074_status_bad_input_and_unreadable_snapshot(tmp_path: Path) -> None:
    fake_alpha = FakeExport([milestone("m2", "2026-11-09", "2026-12-02")])
    api = make(tmp_path, {"alpha": fake_alpha})
    assert api.get("/api/reports/status", params={"project": "nope"}).status_code == 404
    for extra in ({"days": "14"}, {"milestone": "a b"}, {"milestone": "m2", "days": "7"}):
        r = api.get("/api/reports/status", params={"project": "alpha", **extra})
        assert r.status_code == 422 and "error" in r.json()
    assert fake_alpha.calls == []

    broken = FakeExport(failure=BeadsError("snapshot broken"))
    api_broken = make(tmp_path, {"alpha": broken})
    for _ in range(2):
        r = api_broken.get("/api/reports/status", params={"project": "alpha"})
        assert r.status_code == 502 and r.json() == {"error": "snapshot broken"}
    assert len(broken.calls) == 2


# REQ-REPORTS-021
# TC: TC-REPORTS-075@da2eb366
def test_tc_reports_075_epic_milestone_membership_and_points_history(tmp_path: Path) -> None:
    beads = [
        milestone("m2", "2026-11-09", "2026-12-02", meta={"kickoff": "2026-11-09"}),
        milestone("m3", "2026-12-07", "2026-12-31"),
        bead(
            "e-4",
            issue_type="epic",
            parent="m2",
            created_at="2026-11-02T10:00:00Z",
            metadata={
                "points": 3,
                "milestone_moves": [{"from": None, "to": "m2", "at": "2026-11-18T09:00:00Z"}],
            },
        ),
        bead(
            "e-5",
            issue_type="epic",
            parent="m3",
            created_at="2026-11-01T10:00:00Z",
            metadata={
                "points": 5,
                "milestone_moves": [{"from": "m2", "to": "m3", "at": "2026-11-20T10:00:00Z"}],
            },
        ),
        bead(
            "e-2",
            issue_type="epic",
            parent="m2",
            created_at="2026-11-01T10:00:00Z",
            metadata={
                "points": 8,
                "points_history": [
                    {"from": None, "to": 5, "at": "2026-11-10T08:00:00Z"},
                    {"from": 5, "to": 8, "at": "2026-11-16T08:00:00Z"},
                ],
            },
        ),
        bead(
            "e-6",
            issue_type="epic",
            parent="m2",
            created_at="2026-11-03T10:00:00Z",
            metadata={"points": 3},
        ),
        bead(
            "e-7",
            issue_type="epic",
            parent="m2",
            created_at="2026-11-03T10:00:00Z",
            metadata={
                "points": 5,
                "points_history": "oops",
                "milestone_moves": [{"to": "m3"}],
            },
        ),
    ]
    api = make(tmp_path, {"alpha": FakeExport(beads)})
    r = api.get("/api/reports/status", params={"project": "alpha", "milestone": "m2"})
    assert r.status_code == 200
    body = r.json()
    by_day = {row["day"]: row["scope_points"] for row in body["burnup"]}
    assert by_day["2026-11-09"] == 13
    assert by_day["2026-11-10"] == 18
    assert by_day["2026-11-16"] == 21
    assert by_day["2026-11-18"] == 24
    assert by_day["2026-11-20"] == 19
    assert [e["id"] for e in body["epics"]] == ["e-2", "e-4", "e-6", "e-7"]


# REQ-REPORTS-022
# TC: TC-REPORTS-076@9091b2c2
def test_tc_reports_076_burnup_scope_done_points_and_boundaries(tmp_path: Path) -> None:
    beads = [
        milestone(
            "m1",
            "2026-10-05",
            "2026-10-30",
            status="closed",
            closed_at="2026-11-03T12:00:00Z",
            meta={"kickoff": "2026-10-05"},
        ),
        milestone("m2", "2026-11-09", "2026-12-02", meta={"kickoff": "2026-11-11"}),
        milestone("m3", "2026-12-18", "2026-12-31"),
        bead(
            "e-1",
            issue_type="epic",
            parent="m2",
            status="closed",
            created_at="2026-11-02T10:00:00Z",
            closed_at="2026-11-18T10:00:00Z",
            metadata={"points": 8},
        ),
        bead(
            "t-1",
            parent="e-1",
            status="closed",
            created_at="2026-11-12T10:00:00Z",
            closed_at="2026-11-13T10:00:00Z",
        ),
        bead(
            "t-2",
            parent="e-1",
            status="closed",
            created_at="2026-11-12T10:00:00Z",
            closed_at="2026-11-13T10:00:00Z",
        ),
        bead(
            "t-3",
            parent="e-1",
            status="closed",
            created_at="2026-11-12T10:00:00Z",
            closed_at="2026-11-17T10:00:00Z",
        ),
        bead(
            "t-4",
            parent="e-1",
            status="closed",
            created_at="2026-11-12T10:00:00Z",
            closed_at="2026-11-18T10:00:00Z",
        ),
        bead(
            "e-2",
            issue_type="epic",
            parent="m2",
            created_at="2026-11-02T10:00:00Z",
            metadata={
                "points": 8,
                "points_history": [
                    {"from": None, "to": 5, "at": "2026-11-03T08:00:00Z"},
                    {"from": 5, "to": 8, "at": "2026-11-16T08:00:00Z"},
                ],
            },
        ),
    ]
    api = make(tmp_path, {"alpha": FakeExport(beads)})

    m2 = api.get("/api/reports/status", params={"project": "alpha", "milestone": "m2"}).json()
    by_day = {row["day"]: row for row in m2["burnup"]}
    assert by_day["2026-11-11"]["scope_points"] == by_day["2026-11-12"]["scope_points"] == 13
    assert by_day["2026-11-13"]["done_points"] == 4
    assert by_day["2026-11-18"]["done_points"] == 8
    assert by_day["2026-11-16"]["scope_points"] == 16

    m1 = api.get("/api/reports/status", params={"project": "alpha", "milestone": "m1"}).json()
    assert m1["burnup"][-1]["day"] == "2026-11-03"

    m3 = api.get("/api/reports/status", params={"project": "alpha", "milestone": "m3"}).json()
    assert m3["burnup"] == []


# REQ-REPORTS-023
# TC: TC-REPORTS-077@26c8be85
def test_tc_reports_077_status_kpis_week_ago_deltas_oldest_wait_and_kickoff_week(
    tmp_path: Path,
) -> None:
    beads: list[dict[str, Any]] = [
        milestone("m2", "2026-11-02", "2026-12-02", meta={"kickoff": "2026-11-02"}),
        milestone("m4", "2026-11-20", "2026-12-18", meta={"kickoff": "2026-11-20"}),
        bead(
            "e-1",
            issue_type="epic",
            parent="m2",
            created_at="2026-11-01T10:00:00Z",
            metadata={"points": 8},
        ),
        bead(
            "e-4",
            issue_type="epic",
            parent="m4",
            created_at="2026-11-20T10:00:00Z",
            metadata={"points": 3},
        ),
        bead("t-9", status="open", created_at="2026-11-10T10:00:00Z"),
        bead(
            "t-3",
            parent="e-1",
            status="open",
            created_at="2026-11-10T10:00:00Z",
            dependencies=[
                {
                    **dep("t-3", "t-9", "blocks"),
                    "created_at": "2026-11-17T10:00:00Z",  # 4 working days before Mon 23 Nov
                }
            ],
        ),
        bead(
            "t-4",
            parent="e-1",
            status="blocked",
            created_at="2026-11-10T10:00:00Z",
            updated_at="2026-11-19T10:00:00Z",  # 2 working days before Mon 23 Nov
        ),
    ]
    for i in range(10):
        beads.append(
            bead(
                f"c-early-{i}",
                parent="e-1",
                status="closed",
                created_at="2026-11-02T10:00:00Z",
                closed_at="2026-11-12T10:00:00Z",
            )
        )
    for i in range(3):
        beads.append(
            bead(
                f"c-late-{i}",
                parent="e-1",
                status="closed",
                created_at="2026-11-02T10:00:00Z",
                closed_at="2026-11-20T10:00:00Z",
            )
        )

    api = make(tmp_path, {"alpha": FakeExport(beads)})
    write_reopens(
        tmp_path / "alpha",
        [
            ("c-early-0", "2026-11-13T10:00:00Z"),  # before week-ago 2026-11-16
            ("c-early-1", "2026-11-19T10:00:00Z"),  # after week-ago 2026-11-16
        ],
    )

    m2 = api.get("/api/reports/status", params={"project": "alpha", "milestone": "m2"}).json()
    kpis = m2["kpis"]
    assert kpis["beads"]["done"] == 13
    assert kpis["beads"]["done_week_ago"] == 10
    assert kpis["points"]["at_kickoff"] == m2["burnup"][0]["scope_points"]
    assert kpis["points"]["scope"] == m2["burnup"][-1]["scope_points"]
    assert kpis["points"]["done"] == m2["burnup"][-1]["done_points"]
    assert kpis["blocked"] == {"count": 2, "oldest_days": 4}
    assert kpis["rework"]["rate_week_ago"] == 0.1

    m4 = api.get("/api/reports/status", params={"project": "alpha", "milestone": "m4"}).json()
    k4 = m4["kpis"]
    assert k4["beads"]["done_week_ago"] is None
    assert k4["beads"]["scope_week_ago"] is None
    assert k4["points"]["done_week_ago"] is None
    assert k4["pace"]["pace_week_ago"] is None
    assert k4["rework"]["rate_week_ago"] is None


# REQ-REPORTS-024
# TC: TC-REPORTS-078@fa8d7860
def test_tc_reports_078_changes_since_kickoff_and_splits_ignored(tmp_path: Path) -> None:
    beads = [
        milestone("m2", "2026-11-09", "2026-12-02", meta={"kickoff": "2026-11-11"}),
        milestone("m3", "2026-12-07", "2026-12-31"),
        bead(
            "e-1",
            issue_type="epic",
            parent="m2",
            created_at="2026-11-02T10:00:00Z",
            metadata={"points": 8},
        ),
        *[bead(f"t-{i}", parent="e-1", created_at="2026-11-12T10:00:00Z") for i in range(1, 5)],
        bead(
            "e-2",
            issue_type="epic",
            parent="m2",
            created_at="2026-11-02T10:00:00Z",
            metadata={
                "points": 8,
                "points_history": [
                    {"from": None, "to": 5, "at": "2026-11-03T08:00:00Z"},
                    {"from": 5, "to": 8, "at": "2026-11-16T08:00:00Z"},
                ],
            },
        ),
        bead("t-7", parent="e-2", created_at="2026-11-12T10:00:00Z"),
        bead(
            "b-1", issue_type="bug", parent="t-7", assignee="chi", created_at="2026-11-18T10:00:00Z"
        ),
        bead(
            "e-4",
            issue_type="epic",
            parent="m2",
            created_at="2026-11-02T10:00:00Z",
            metadata={
                "points": 3,
                "milestone_moves": [{"from": None, "to": "m2", "at": "2026-11-18T09:00:00Z"}],
            },
        ),
        bead(
            "e-5",
            issue_type="epic",
            parent="m3",
            created_at="2026-11-02T10:00:00Z",
            metadata={
                "points": 5,
                "milestone_moves": [{"from": "m2", "to": "m3", "at": "2026-11-20T10:00:00Z"}],
            },
        ),
    ]
    api = make(tmp_path, {"alpha": FakeExport(beads)})
    body = api.get("/api/reports/status", params={"project": "alpha", "milestone": "m2"}).json()
    items = body["changes"]["items"]
    assert [(i["day"], i["kind"], i["id"]) for i in items] == [
        ("2026-11-20", "epic_removed", "e-5"),
        ("2026-11-18", "bug_added", "b-1"),
        ("2026-11-18", "epic_added", "e-4"),
        ("2026-11-16", "re_estimated", "e-2"),
    ]
    assert items[0]["points"] == 5
    assert items[1]["epic"] == {"id": "e-2", "title": "Title of e-2"}
    assert items[1]["person"] == "chi"
    assert items[2]["points"] == 3
    assert (items[3]["from"], items[3]["to"]) == (5, 8)
    assert all(i["id"] not in {"e-1", "t-1", "t-2", "t-3", "t-4"} for i in items)


# REQ-REPORTS-025
# TC: TC-REPORTS-079@0d027e04
def test_tc_reports_079_status_risks_blocked_chain_cap_and_unestimated(tmp_path: Path) -> None:
    beads: list[dict[str, Any]] = [
        milestone("m2", "2026-11-09", "2026-12-02", meta={"kickoff": "2026-11-11"}),
        bead("e-1", issue_type="epic", parent="m2", metadata={"points": 5}),
        bead("e-5", issue_type="epic", parent="m2", status="open"),
        bead("e-7", issue_type="epic", parent="m2", status="open"),
        bead(
            "e-3", issue_type="epic", parent="m2", status="closed", closed_at="2026-11-18T10:00:00Z"
        ),
        bead("t-9", status="open"),
        bead(
            "t-8",
            title="Mobile layout",
            status="open",
            assignee="bao@example.com",
            dependencies=[dep("t-8", "t-9", "blocks")],
        ),
        bead(
            "t-3",
            title="End-to-end checkout QA",
            parent="e-1",
            status="open",
            dependencies=[{**dep("t-3", "t-8", "blocks"), "created_at": "2026-11-17T10:00:00Z"}],
        ),
        bead("t-4", parent="e-1", status="blocked", updated_at="2026-11-18T10:00:00Z"),
    ]
    for i in range(5):
        beads.append(
            bead(f"t-b{i}", parent="e-1", status="blocked", updated_at="2026-11-20T10:00:00Z")
        )

    api = make(tmp_path, {"alpha": FakeExport(beads)})
    risks = api.get("/api/reports/status", params={"project": "alpha", "milestone": "m2"}).json()[
        "risks"
    ]
    assert len(risks["blocked"]) == 5
    assert risks["blocked_more"] == 2
    assert risks["blocked"][0] == {
        "id": "t-3",
        "title": "End-to-end checkout QA",
        "days": 4,
        "blocker": {"id": "t-8", "title": "Mobile layout", "person": "bao", "blocked": True},
    }
    assert risks["blocked"][1]["id"] == "t-4"
    assert risks["blocked"][1]["blocker"] is None
    assert [e["id"] for e in risks["unestimated"]] == ["e-5", "e-7"]


# REQ-REPORTS-026
# TC: TC-REPORTS-080@e7c0fa81
def test_tc_reports_080_status_epic_rows_open_and_closed(tmp_path: Path) -> None:
    beads = [
        milestone("m2", "2026-11-09", "2026-12-02", meta={"kickoff": "2026-11-11"}),
        bead(
            "e-1",
            issue_type="epic",
            parent="m2",
            status="open",
            assignee="lead@example.com",
            metadata={"points": 8},
        ),
        bead(
            "t-1",
            parent="e-1",
            status="closed",
            closed_at="2026-11-15T10:00:00Z",
            dependencies=[dep("t-1", "e-1", "parent-child")],
        ),
        bead(
            "t-2",
            parent="e-1",
            status="closed",
            closed_at="2026-11-16T10:00:00Z",
            dependencies=[dep("t-2", "e-1", "parent-child")],
        ),
        bead("t-3", parent="e-1", status="open", dependencies=[dep("t-3", "e-1", "parent-child")]),
        bead(
            "t-4",
            parent="e-1",
            status="in_progress",
            dependencies=[dep("t-4", "e-1", "parent-child")],
        ),
        bead(
            "e-3",
            issue_type="epic",
            parent="m2",
            status="closed",
            closed_at="2026-11-20T15:00:00Z",
        ),
    ]
    api = make(tmp_path, {"alpha": FakeExport(beads)})
    epics = api.get("/api/reports/status", params={"project": "alpha", "milestone": "m2"}).json()[
        "epics"
    ]
    assert [e["id"] for e in epics] == ["e-1", "e-3"]
    assert epics[0]["points"] == 8
    assert epics[0]["person"] == "lead"
    assert epics[0]["closed_on"] is None
    assert epics[0]["child_counts"]["closed"] == 2
    assert epics[0]["child_counts"]["total"] == 4
    assert epics[1]["person"] == "Unassigned"
    assert epics[1]["closed_on"] == "2026-11-20"


# REQ-REPORTS-034
# TC: TC-REPORTS-081@fc511524
def test_tc_reports_081_team_points_delivered_and_estimate_accuracy(tmp_path: Path) -> None:
    beads = [
        milestone(
            "m1",
            "2026-10-05",
            "2026-10-30",
            status="closed",
            closed_at="2026-10-30T17:00:00Z",
            meta={"kickoff": "2026-10-05", "planned_days_per_point": 1.5},
        ),
        bead(
            "e-a",
            issue_type="epic",
            parent="m1",
            status="closed",
            assignee="ann",
            started_at="2026-10-05T09:00:00Z",
            closed_at="2026-10-12T17:00:00Z",  # Mon 5..Mon 12 = 6 working days
            metadata={"points": 5},
        ),
        bead(
            "e-b",
            issue_type="epic",
            parent="m1",
            status="closed",
            assignee="ann",
            started_at="2026-10-13T09:00:00Z",
            closed_at="2026-10-16T17:00:00Z",  # Tue 13..Fri 16 = 4 working days
            metadata={"points": 3},
        ),
        milestone("m2", "2026-11-09", "2026-12-02", meta={"kickoff": "2026-11-09"}),
        bead(
            "e-1",
            issue_type="epic",
            parent="m2",
            status="closed",
            closed_at="2026-11-18T10:00:00Z",
            metadata={"points": 8},
        ),
        bead(
            "t-1", parent="e-1", status="closed", assignee="ann", closed_at="2026-11-15T10:00:00Z"
        ),
        bead(
            "t-2", parent="e-1", status="closed", assignee="ann", closed_at="2026-11-16T10:00:00Z"
        ),
        bead(
            "t-3", parent="e-1", status="closed", assignee="ann", closed_at="2026-11-17T10:00:00Z"
        ),
        bead(
            "t-4",
            parent="e-1",
            status="closed",
            assignee="bao@example.com",
            closed_at="2026-11-18T10:00:00Z",
        ),
        bead(
            "e-2",
            issue_type="epic",
            parent="m2",
            status="closed",
            assignee="chi",
            closed_at="2026-11-19T10:00:00Z",
            metadata={"points": 3},
        ),
    ]
    api = make(tmp_path, {"alpha": FakeExport(beads)})

    m2 = api.get("/api/reports/team", params={"project": "alpha", "milestone": "m2"}).json()
    by_member = {m["member"]: m for m in m2["members"]}
    assert by_member["ann"]["points_delivered"] == 6
    assert by_member["bao"]["points_delivered"] == 2
    assert by_member["chi"]["points_delivered"] == 3
    assert m2["team"]["points_delivered"] == 11
    assert m2["team"]["accuracy"] is None
    assert all(m["accuracy"] is None for m in m2["members"])

    m1 = api.get("/api/reports/team", params={"project": "alpha", "milestone": "m1"}).json()
    assert m1["team"]["accuracy"] == 1.2

    period = api.get("/api/reports/team", params={"project": "alpha", "days": "30"}).json()
    assert period["team"]["accuracy"] is None
    assert all(m["accuracy"] is None for m in period["members"])


# REQ-REPORTS-035
# TC: TC-REPORTS-082@93f8294c
def test_tc_reports_082_team_trend_last_six_and_unassigned_count(tmp_path: Path) -> None:
    beads: list[dict[str, Any]] = [
        milestone(
            "m1", "2026-04-06", "2026-04-24", status="closed", closed_at="2026-04-24T12:00:00Z"
        ),
        milestone(
            "m2", "2026-05-04", "2026-05-22", status="closed", closed_at="2026-05-22T12:00:00Z"
        ),
        milestone(
            "m3", "2026-06-01", "2026-06-19", status="closed", closed_at="2026-06-19T12:00:00Z"
        ),
        milestone(
            "m4", "2026-07-06", "2026-07-24", status="closed", closed_at="2026-07-24T12:00:00Z"
        ),
        milestone(
            "m5", "2026-08-03", "2026-08-21", status="closed", closed_at="2026-08-21T12:00:00Z"
        ),
        milestone(
            "m6", "2026-09-07", "2026-09-25", status="closed", closed_at="2026-09-25T12:00:00Z"
        ),
        milestone(
            "m7", "2026-10-05", "2026-10-30", status="closed", closed_at="2026-10-30T12:00:00Z"
        ),
        milestone("m8", "2026-11-09", "2026-12-02", meta={"kickoff": "2026-11-09"}),
        milestone("m9", "2026-12-14", "2026-12-31"),
        bead("e-8", issue_type="epic", parent="m8"),
    ]
    for i in range(22):
        beads.append(
            bead(
                f"a-{i}",
                parent="e-8",
                status="closed",
                assignee="ann",
                closed_at="2026-11-18T10:00:00Z",
            )
        )
    for i in range(8):
        beads.append(
            bead(f"u-{i}", parent="e-8", status="closed", closed_at="2026-11-18T10:00:00Z")
        )

    api = make(tmp_path, {"alpha": FakeExport(beads)})
    r_m = api.get("/api/reports/team", params={"project": "alpha"}).json()
    assert [t["id"] for t in r_m["trend"]] == ["m3", "m4", "m5", "m6", "m7", "m8"]
    assert r_m["unassigned"] == {"closed": 8, "total": 30}

    r_p = api.get("/api/reports/team", params={"project": "alpha", "days": "30"}).json()
    assert [t["id"] for t in r_p["trend"]] == ["m3", "m4", "m5", "m6", "m7", "m8"]
