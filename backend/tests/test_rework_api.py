"""Quality and rework from Beads over HTTP: reopens from `.beads/interactions.jsonl` and bugs found
later (REQ-REPORTS-005, REQ-REPORTS-007, REQ-REPORTS-019), and the team scope and KPIs that use them
(REQ-REPORTS-009, REQ-REPORTS-010)."""

import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from fake_bd import FakeBd
from fake_export import FakeExport, bead, dep, write_export
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.beads.source import BeadsError, read_export
from gin_console.config import ProjectEntry, Settings

NOW = datetime(2026, 11, 12, 12, 0, tzinfo=UTC)  # a Thursday


class Clock:
    def __init__(self) -> None:
        self.now = NOW

    def __call__(self) -> datetime:
        return self.now


def make(
    tmp_path: Path,
    projects: dict[str, list[Any]],
    failing: dict[str, FakeExport] | None = None,
    clock: Clock | None = None,
) -> TestClient:
    """An app over projects whose `.beads/issues.jsonl` hold the given rows; a project in
    `failing` answers with its fake instead."""
    (tmp_path / "dist").mkdir(exist_ok=True)
    for name, rows in projects.items():
        write_export(tmp_path / name, rows)
    fakes = failing or {}
    app = create_app(
        Settings(projects=[ProjectEntry(name=n, path=tmp_path / n) for n in projects]),
        static_dir=tmp_path / "dist",
        read_beads=lambda cwd: fakes[cwd.name](cwd) if cwd.name in fakes else read_export(cwd),
        run_bd=FakeBd(),
        clock=clock or Clock(),
    )
    return TestClient(app, raise_server_exceptions=False)


def at(day: str) -> str:
    return f"{day}T12:00:00Z"


def done(ident: str, day: str = "2026-11-10", **fields: Any) -> dict[str, Any]:
    return bead(ident, status="closed", closed_at=at(day), **fields)


def status_change(ident: str, old: str, new: str) -> dict[str, Any]:
    return {
        "id": "int-1",
        "kind": "field_change",
        "issue_id": ident,
        "extra": {"field": "status", "old_value": old, "new_value": new},
    }


def write_log(project: Path, lines: list[Any]) -> Path:
    path = project / ".beads" / "interactions.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join((x if isinstance(x, str) else json.dumps(x)) + "\n" for x in lines))
    return path


def report(api: TestClient, project: str = "alpha", **params: Any) -> Any:
    response = api.get("/api/reports", params={"project": project, **params})
    assert response.status_code == 200
    return response.json()


def team_report(api: TestClient, **params: str) -> Any:
    response = api.get("/api/reports/team", params={"project": "alpha", **params})
    assert response.status_code == 200
    return response.json()


def member(body: Any, name: str) -> Any:
    return next(m for m in body["quality"]["members"] if m["member"] == name)


def milestones() -> list[dict[str, Any]]:
    return [
        bead(
            "m1",
            issue_type="milestone",
            status="closed",
            closed_at=at("2026-11-03"),
            metadata={"start": "2026-10-05", "end": "2026-10-30"},
        ),
        bead(
            "m2",
            issue_type="milestone",
            metadata={"start": "2026-11-02", "end": "2026-11-27", "kickoff": "2026-11-02"},
        ),
    ]


def under(milestone: str, epic: str, beads: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [bead(epic, issue_type="epic", parent=milestone), *beads]


# REQ-REPORTS-009
# TC: TC-REPORTS-015@4d3834ae
def test_tc_reports_015_nested_beads(tmp_path: Path) -> None:
    rows = [
        *milestones(),
        bead("m3", issue_type="milestone", metadata={"start": "2026-11-30", "end": "2026-12-25"}),
        bead("e1", issue_type="epic", parent="m2"),
        bead("e1.1", parent="e1"),
        bead("e1.1.1", parent="e1.1"),
        bead("e9", issue_type="epic", parent="m3"),
        bead("e9.1", parent="e9"),
    ]
    body = team_report(make(tmp_path, {"alpha": rows}), milestone="m2")
    by_id = {b["id"]: b for b in body["beads"]}
    assert set(by_id) == {"e1.1", "e1.1.1"}
    assert {b["epic"]["id"] for b in by_id.values()} == {"e1"}


# REQ-REPORTS-009
# TC: TC-REPORTS-016@0172d378
def test_tc_reports_016_buckets_and_members(tmp_path: Path) -> None:
    rows = [
        *milestones(),
        *under(
            "m2",
            "e1",
            [
                bead("e1.1", parent="e1", status="blocked"),
                bead("e1.2", parent="e1", status="deferred", assignee="ann"),
                bead("e1.3", parent="e1", status="in_progress", assignee="bao"),
                bead(
                    "e1.4",
                    parent="e1",
                    status="in_progress",
                    assignee="bao@example.com",
                    dependencies=[dep("e1.4", "x-1", "blocks")],
                ),
                bead("x-1"),
            ],
        ),
    ]
    body = team_report(make(tmp_path, {"alpha": rows}), milestone="m2")
    by_id = {b["id"]: b for b in body["beads"]}
    assert [by_id[i]["bucket"] for i in ("e1.1", "e1.2", "e1.3", "e1.4")] == [
        "open",
        "open",
        "in_progress",
        "open",
    ]
    members = {m["member"]: m["scope"] for m in body["members"]}
    assert members == {"bao": 2, "ann": 1, "Unassigned": 1}
    assert by_id["e1.1"]["blocked"] and by_id["e1.4"]["blocked"]
    assert not by_id["e1.3"]["blocked"]


# REQ-REPORTS-009
# TC: TC-REPORTS-017@3e07d743
def test_tc_reports_017_late_close(tmp_path: Path) -> None:
    rows = [
        *milestones(),
        *under("m2", "e1", [done("e1.1", "2026-12-01", parent="e1")]),
    ]
    body = team_report(make(tmp_path, {"alpha": rows}), milestone="m2")
    assert body["beads"][0]["late_days"] == 2


# REQ-REPORTS-010
# TC: TC-REPORTS-018@2073462b
def test_tc_reports_018_pace(tmp_path: Path) -> None:
    days = ["2026-11-06", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12"]
    beads = [done(f"c{n}", days[n % 5], parent="e1") for n in range(18)]
    beads += [done(f"d{n}", "2026-11-03", parent="e1") for n in range(9)]
    beads += [bead(f"p{n}", parent="e1", status="in_progress") for n in range(10)]
    beads += [bead(f"o{n}", parent="e1") for n in range(27)]
    body = team_report(make(tmp_path, {"alpha": [*milestones(), *under("m2", "e1", beads)]}))
    t = body["team"]
    assert (t["scope"], t["closed"]) == (64, 27)
    assert t["throughput"] == 18
    assert t["pace"] == 3.6
    assert t["days_left"] == 11
    assert t["pace_needed"] == round(37 / 11, 2)
    assert t["elapsed"] == 9


# REQ-REPORTS-010
# TC: TC-REPORTS-019@bade7196
def test_tc_reports_019_closed_milestone(tmp_path: Path) -> None:
    beads = [done(f"a{n}", "2026-10-20", parent="e1") for n in range(51)]
    beads += [done(f"b{n}", "2026-11-02" if n < 4 else "2026-11-03", parent="e1") for n in range(7)]
    body = team_report(
        make(tmp_path, {"alpha": [*milestones(), *under("m1", "e1", beads)]}), milestone="m1"
    )
    assert body["team"]["throughput"] == 13.2
    assert body["team"]["pace_needed"] is None
    assert body["team"]["on_time"] == round(51 / 58, 4)


# REQ-REPORTS-010
# TC: TC-REPORTS-020@c7136b1c
def test_tc_reports_020_rework_rate(tmp_path: Path) -> None:
    beads = [done(f"a{n}", parent="e1", assignee="ann") for n in (1, 2, 3, 4)]
    beads.append(
        bead("bug1", issue_type="bug", dependencies=[dep("bug1", "a2", "discovered-from")])
    )
    rows = [*milestones(), *under("m2", "e1", beads)]
    api = make(tmp_path, {"alpha": rows})
    write_log(tmp_path / "alpha", [status_change("a1", "closed", "open")])
    ann = next(m for m in team_report(api)["members"] if m["member"] == "ann")
    assert ann["rework_rate"] == 0.5
    assert (ann["reopens"], ann["bugs"]) == (1, 1)


# REQ-REPORTS-010
# TC: TC-REPORTS-021@97ed24c8
def test_tc_reports_021_member_order(tmp_path: Path) -> None:
    beads = [bead(f"a{n}", parent="e1", assignee="ann") for n in range(3)]
    beads += [bead(f"b{n}", parent="e1", assignee="bao") for n in range(5)]
    beads += [bead(f"u{n}", parent="e1") for n in range(6)]
    body = team_report(make(tmp_path, {"alpha": [*milestones(), *under("m2", "e1", beads)]}))
    assert [m["member"] for m in body["members"]] == ["bao", "ann", "Unassigned"]


# REQ-REPORTS-010
# TC: TC-REPORTS-022@94177b61
def test_tc_reports_022_past_end(tmp_path: Path) -> None:
    late = bead(
        "m1",
        issue_type="milestone",
        metadata={"start": "2026-10-26", "end": "2026-11-11", "kickoff": "2026-10-26"},
    )
    beads = [bead(f"o{n}", parent="e1") for n in range(2)]
    beads += [bead(f"p{n}", parent="e1", status="in_progress") for n in range(2)]
    body = team_report(make(tmp_path, {"alpha": [late, *under("m1", "e1", beads)]}))
    assert body["team"]["late_open"] == 4
    assert body["team"]["pace_needed"] is None


# REQ-REPORTS-009
# TC: TC-REPORTS-044@82ff2d07
def test_tc_reports_044_epic_not_split_into_tasks(tmp_path: Path) -> None:
    rows = [
        *milestones(),
        *(
            bead(e, issue_type="epic", parent="m2", assignee="ann")
            for e in ("e2", "e3", "e4", "e5")
        ),
        done("e5.1", "2026-11-05", parent="e5", assignee="ann"),
    ]
    body = team_report(make(tmp_path, {"alpha": rows}), milestone="m2")
    by_id = {b["id"]: b for b in body["beads"]}
    assert set(by_id) == {"e2", "e3", "e4", "e5.1"}
    assert all(by_id[i]["epic"]["id"] == i for i in ("e2", "e3", "e4"))
    ann = next(m for m in body["members"] if m["member"] == "ann")
    assert (ann["scope"], ann["closed"]) == (4, 1)


# REQ-REPORTS-009
# TC: TC-REPORTS-045@dc2f2ecb
def test_tc_reports_045_nested_epic_without_children(tmp_path: Path) -> None:
    rows = [
        *milestones(),
        bead("e1", issue_type="epic", parent="m2"),
        bead("e1.1", issue_type="epic", parent="e1"),
    ]
    body = team_report(make(tmp_path, {"alpha": rows}), milestone="m2")
    assert [b["id"] for b in body["beads"]] == ["e1.1"]
    assert body["beads"][0]["epic"]["id"] == "e1.1"


# REQ-REPORTS-005
# TC: TC-REPORTS-046@d56feb4d
def test_tc_reports_046_rework_rate(tmp_path: Path) -> None:
    rows = [done(f"a-{n}", assignee="ann") for n in (1, 2, 3, 4)]
    api = make(tmp_path, {"alpha": rows})
    write_log(tmp_path / "alpha", [status_change("a-1", "closed", "open")])
    ann = member(report(api), "ann")
    assert (ann["closed"], ann["reopens"], ann["rework_rate"]) == (4, 1, 0.25)


# REQ-REPORTS-005
# TC: TC-REPORTS-047@1be5c1bb
def test_tc_reports_047_epic_rows(tmp_path: Path) -> None:
    rows = [
        bead("e-1", issue_type="epic"),
        bead("e-2", issue_type="epic"),
        done("t-1", parent="e-1"),
        done("t-2", parent="e-1"),
        done("t-3", parent="e-2"),
        done("t-4", parent="e-2"),
    ]
    api = make(tmp_path, {"alpha": rows})
    write_log(tmp_path / "alpha", [status_change("t-1", "closed", "open")])
    epics = report(api)["quality"]["epics"]
    assert [e["id"] for e in epics] == ["e-1", "e-2"]
    assert (epics[0]["closed"], epics[0]["reopens"], epics[0]["rework_rate"]) == (2, 1, 0.5)
    assert (epics[1]["closed"], epics[1]["rework_rate"]) == (2, 0)
    assert epics[0]["project"] == "alpha"


# REQ-REPORTS-005
# TC: TC-REPORTS-048@38112718
def test_tc_reports_048_old_ai_usage_ignored(tmp_path: Path) -> None:
    rows = [done("a-1", metadata={"ai_usage": {"version": 1, "quality": {"reopens": 5}}})]
    body = report(make(tmp_path, {"alpha": rows}))
    assert member(body, "Unassigned")["reopens"] == 0
    assert body["totals"]["rework_rate"] == 0


# REQ-REPORTS-009
# TC: TC-REPORTS-050@3e06e028
def test_tc_reports_050_prep_tasks_left_out(tmp_path: Path) -> None:
    rows = [
        *milestones(),
        bead("e-1", issue_type="epic", parent="m2"),
        bead("t-1", parent="e-1"),
        bead("t-2", parent="e-1"),
        bead("p-1", parent="e-1", labels=["prep", "prep:mockup"]),
        bead("e-2", issue_type="epic", parent="m2"),
        bead("p-2", parent="e-2", labels=["prep"]),
    ]
    body = team_report(make(tmp_path, {"alpha": rows}), milestone="m2")
    by_id = {b["id"]: b for b in body["beads"]}
    assert set(by_id) == {"t-1", "t-2", "e-2"}
    assert by_id["e-2"]["epic"]["id"] == "e-2"


# REQ-REPORTS-007
# TC: TC-REPORTS-062@dde4044d
def test_tc_reports_062_single_project_fails(tmp_path: Path) -> None:
    fake = FakeExport(failure=BeadsError("boom"))
    api = make(tmp_path, {"alpha": []}, failing={"alpha": fake})
    for _ in range(2):
        response = api.get("/api/reports", params={"project": "alpha"})
        assert response.status_code == 502
    assert len(fake.calls) == 2


# REQ-REPORTS-019
# TC: TC-REPORTS-064@339d7077
def test_tc_reports_064_reopens_counted(tmp_path: Path) -> None:
    api = make(tmp_path, {"alpha": [done("a-1", assignee="ann")]})
    write_log(
        tmp_path / "alpha",
        [
            status_change("a-1", "in_progress", "closed"),
            status_change("a-1", "closed", "open"),
            status_change("a-1", "open", "closed"),
            status_change("a-1", "closed", "in_progress"),
        ],
    )
    assert member(report(api), "ann")["reopens"] == 2


# REQ-REPORTS-019
# TC: TC-REPORTS-065@538cd352
def test_tc_reports_065_bugs_found_later(tmp_path: Path) -> None:
    rows = [
        *milestones(),
        *under(
            "m2",
            "e1",
            [
                done("a-1", parent="e1", assignee="ann"),
                done("a-9", issue_type="bug", dependencies=[dep("a-9", "a-1", "discovered-from")]),
                bead(
                    "a-10", issue_type="bug", dependencies=[dep("a-10", "a-1", "discovered-from")]
                ),
                bead("a-11", dependencies=[dep("a-11", "a-1", "discovered-from")]),
            ],
        ),
    ]
    api = make(tmp_path, {"alpha": rows})
    ann = member(report(api), "ann")
    assert (ann["bugs"], ann["reopens"]) == (2, 0)
    bead_row = next(b for b in team_report(api, milestone="m2")["beads"] if b["id"] == "a-1")
    assert bead_row["rework"] == 2


# REQ-REPORTS-019
# TC: TC-REPORTS-066@f9b9172e
def test_tc_reports_066_missing_or_broken_log(tmp_path: Path) -> None:
    api = make(
        tmp_path,
        {"alpha": [done("a-1", assignee="ann")], "beta": [done("b-1", assignee="bao")]},
    )
    write_log(
        tmp_path / "beta",
        [
            "not json",
            {"kind": "field_change", "issue_id": "b-1"},
            status_change("b-1", "closed", "open"),
        ],
    )
    response = api.get("/api/reports", params={"project": "beta"})
    assert response.status_code == 200
    body = response.json()
    assert member(body, "bao")["reopens"] == 1
    assert member(report(api, "alpha"), "ann")["reopens"] == 0


# REQ-REPORTS-019
# TC: TC-REPORTS-067@a0330ad9
def test_tc_reports_067_read_again_only_on_change(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    clock = Clock()
    api = make(tmp_path, {"alpha": [done("a-1", assignee="ann")]}, clock=clock)
    log = write_log(tmp_path / "alpha", [status_change("a-1", "closed", "open")])
    reads: list[Path] = []
    real_open = Path.open

    def counting(self: Path, *args: Any, **kwargs: Any) -> Any:
        if self == log:
            reads.append(self)
        return real_open(self, *args, **kwargs)

    monkeypatch.setattr(Path, "open", counting)
    assert member(report(api), "ann")["reopens"] == 1
    assert len(reads) == 1
    clock.now += timedelta(seconds=61)  # past the report cache, so the report is built again
    assert member(report(api), "ann")["reopens"] == 1
    assert len(reads) == 1
    with real_open(log, "a") as out:
        out.write(json.dumps(status_change("a-1", "closed", "open")) + "\n")
    clock.now += timedelta(seconds=61)
    assert member(report(api), "ann")["reopens"] == 2
    assert len(reads) == 2


# REQ-REPORTS-001
# TC: TC-REPORTS-068@53255b34
def test_tc_reports_068_no_ai_usage_in_the_answer(tmp_path: Path) -> None:
    rows = [done("a-1", metadata={"ai_usage": {"version": 1, "tokens": {"total": 9}}})]
    body = report(make(tmp_path, {"alpha": rows}))
    assert "usage" not in body and "coverage" not in body
    assert set(body["totals"]) == {"closed", "rework_rate"}
