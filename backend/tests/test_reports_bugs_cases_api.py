"""API cases of the bugs report (REQ-REPORTS-039 to 042), through the app with a fake export."""

import subprocess
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from fake_export import FakeExport, bead, dep
from fastapi.testclient import TestClient
from test_reports_bugs_api import Clock, alpha, get
from test_reports_team_api import make

from gin_console.beads.source import BeadsError


def at(day: str) -> str:
    return f"{day}T12:00:00Z"


def bug(ident: str, day: str, **fields: Any) -> dict[str, Any]:
    return bead(ident, issue_type="bug", created_at=at(day), **fields)


def shut(ident: str, made: str, done: str, **fields: Any) -> dict[str, Any]:
    return bug(ident, made, status="closed", closed_at=at(done), **fields)


def found(ident: str, *targets: str, **fields: Any) -> dict[str, Any]:
    deps = [dep(ident, target, "discovered-from") for target in targets]
    return bug(ident, "2026-11-20", dependencies=deps, **fields)


def serve(tmp_path: Path, rows: list[dict[str, Any]], now: datetime | None = None) -> TestClient:
    clock = Clock()
    if now is not None:
        clock.now = now
    return make(tmp_path, {"alpha": FakeExport(rows)}, clock)


# REQ-REPORTS-039
# TC: TC-REPORTS-091@f1e8f560
def test_tc_reports_091_bugs_report_scope_and_period(tmp_path: Path) -> None:
    gate = bead(
        "g-1", issue_type="bug", title="external: docs/plan.md#2", created_at=at("2026-11-20")
    )
    fake = alpha()
    fake.beads.append(gate)
    beta = FakeExport([bug("b-1", "2026-11-20")])
    api = make(tmp_path, {"alpha": fake, "beta": beta}, Clock())

    m2 = get(api).json()
    assert (m2["milestone"], m2["days"]) == ("m2", None)
    assert m2["period"] == {"start": "2026-11-16", "end": "2026-11-25"}
    assert get(api, milestone="m1").json()["period"] == {
        "start": "2026-10-05",
        "end": "2026-10-30",
    }
    week = get(api, days="7").json()
    assert (week["milestone"], week["days"]) == (None, 7)
    assert week["period"] == {"start": "2026-11-18", "end": "2026-11-25"}
    m3 = get(api, milestone="m3").json()
    assert m3["period"] is None and m3["weeks"] == []
    assert (m3["figures"]["opened"], m3["figures"]["closed"]) == (0, 0)
    assert [b["id"] for b in m3["open"]] == ["b1"]  # the merge gate is no bug
    flat = api.get("/api/reports/bugs", params={"project": "beta"}).json()
    assert (flat["milestone"], flat["days"], flat["period"]) == (None, None, None)
    assert [b["id"] for b in flat["open"]] == ["b-1"]


# REQ-REPORTS-039
# TC: TC-REPORTS-092@2a13d713
def test_tc_reports_092_bugs_report_cache_refresh_and_no_process(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    def boom(*args: Any, **kwargs: Any) -> None:
        raise AssertionError("a process was started")

    clock = Clock()
    api = make(tmp_path, {"alpha": alpha()}, clock)
    monkeypatch.setattr(subprocess, "run", boom)
    monkeypatch.setattr(subprocess, "Popen", boom)
    first = get(api, milestone="m2").json()["generated_at"]
    clock.now += timedelta(seconds=20)
    assert get(api, milestone="m2").json()["generated_at"] == first
    assert api.post("/api/refresh").status_code == 204
    assert get(api, milestone="m2").json()["generated_at"] != first


# REQ-REPORTS-039
# TC: TC-REPORTS-093@c1d81221
def test_tc_reports_093_bugs_report_bad_input_and_unreadable_export(tmp_path: Path) -> None:
    fake = alpha()
    reads: list[Path] = []

    def runner(cwd: Path) -> Any:
        reads.append(cwd)
        if len(reads) == 1:
            raise BeadsError("boom")
        return fake(cwd)

    api = make(tmp_path, {"alpha": runner}, Clock())
    assert get(api, project="nope").status_code == 404
    for extra in ({"days": "14"}, {"milestone": "a b"}, {"milestone": "m2", "days": "7"}):
        r = get(api, **extra)
        assert r.status_code == 422 and "error" in r.json()
    assert reads == []  # the export was not read for any of them
    failed = get(api)
    assert failed.status_code == 502 and "error" in failed.json()
    assert get(api).status_code == 200  # the failure was not cached


# REQ-REPORTS-040
# TC: TC-REPORTS-094@79e0df0d
def test_tc_reports_094_source_epic_of_a_bug(tmp_path: Path) -> None:
    rows = [
        bead("e-1", issue_type="epic"),
        bead("e-2", issue_type="epic", parent="e-1"),
        bead("e-3", issue_type="epic"),
        bead("t-1", parent="e-1"),
        bead("t-3", parent="e-1"),
        bead("t-2", parent="e-2"),
        bead("t-9", parent="e-3"),
        bead("k-1", parent="e-1"),
        bead("t-0"),
        found("b-1", "t-1"),
        found("b-2", "e-2"),
        found("b-3", "t-2", parent="e-1"),
        found("b-4", "t-0", "t-5", "t-9"),
        found("b-5", "b-6"),
        found("b-6", parent="e-1"),
        found("b-7", "b-8"),
        found("b-8", "t-3"),
        found("b-9", parent="k-1"),
        found("b-10"),
        bead("c-1", parent="c-2"),
        bead("c-2", parent="c-1"),
        found("b-11", parent="c-1"),
    ]
    body = get(serve(tmp_path, rows), days="30").json()
    epic = {b["id"]: (b["epic"] or {}).get("id") for b in body["open"]}
    assert epic["b-1"] == "e-1"
    assert epic["b-2"] == "e-2"
    assert epic["b-3"] == "e-2"
    assert epic["b-4"] == "e-3"
    assert epic["b-5"] == "e-1"
    assert epic["b-9"] == "e-1"
    assert epic["b-7"] is None and epic["b-10"] is None and epic["b-11"] is None


# REQ-REPORTS-041
# TC: TC-REPORTS-095@ea71a5b0
def test_tc_reports_095_bug_figures(tmp_path: Path) -> None:
    alpha_rows = [
        shut("b-1", "2026-11-10", "2026-11-20"),
        shut("b-2", "2026-11-19", "2026-11-20"),
        bug("b-3", "2026-11-20", status="deferred"),
    ]
    beta_rows = [
        shut("b-4", "2026-10-01", "2026-10-05"),
        bead("b-5", issue_type="bug", status="closed", created_at=at("2026-10-01")),
    ]
    api = make(tmp_path, {"alpha": FakeExport(alpha_rows), "beta": FakeExport(beta_rows)}, Clock())
    f = get(api, days="7").json()["figures"]
    assert (f["total"], f["opened"], f["closed"], f["open_now"]) == (3, 2, 2, 1)
    assert (f["oldest_open_days"], f["median_close_days"]) == (5, 5.5)
    g = api.get("/api/reports/bugs", params={"project": "beta", "days": "7"}).json()["figures"]
    assert (g["total"], g["opened"], g["closed"], g["open_now"]) == (2, 0, 0, 0)
    assert g["oldest_open_days"] is None and g["median_close_days"] is None


# REQ-REPORTS-041
# TC: TC-REPORTS-096@e5ffcc7b
def test_tc_reports_096_bug_weeks(tmp_path: Path) -> None:
    rows = [
        bug("b-1", "2026-11-17"),
        shut("b-2", "2026-11-18", "2026-11-24"),
        bug("b-3", "2026-11-24"),
    ]
    body = get(serve(tmp_path, rows), days="7").json()
    assert [(w["start"], w["opened"], w["closed"]) for w in body["weeks"]] == [
        ("2026-11-16", 1, 0),
        ("2026-11-23", 1, 1),
    ]
    assert sum(w["opened"] for w in body["weeks"]) == body["figures"]["opened"]
    assert sum(w["closed"] for w in body["weeks"]) == body["figures"]["closed"]

    year_end = [bug("b-1", "2026-12-22"), bug("b-2", "2027-01-05")]
    (tmp_path / "later").mkdir()
    later = serve(tmp_path / "later", year_end, datetime(2027, 1, 8, 12, 0, tzinfo=UTC))
    weeks = get(later, days="30").json()["weeks"]
    assert [(w["start"], w["opened"], w["closed"]) for w in weeks] == [
        ("2026-12-07", 0, 0),
        ("2026-12-14", 0, 0),
        ("2026-12-21", 1, 0),
        ("2026-12-28", 0, 0),
        ("2027-01-04", 1, 0),
    ]


# REQ-REPORTS-042
# TC: TC-REPORTS-097@f33f083f
def test_tc_reports_097_bug_rows_by_epic(tmp_path: Path) -> None:
    rows = [
        bead("e-1", issue_type="epic", title="One"),
        bead("e-2", issue_type="epic", title="Two"),
        bead("e-3", issue_type="epic", title="Three"),
        bead("e-4", issue_type="epic", title="Four"),
        bug("a-1", "2026-11-20", parent="e-1"),
        bug("b-1", "2026-11-19", parent="e-2"),
        shut("b-2", "2026-11-19", "2026-11-21", parent="e-2"),
        bug("b-3", "2026-11-20", parent="e-2"),
        bug("c-1", "2026-10-01", parent="e-3"),
        shut("d-1", "2026-10-01", "2026-10-05", parent="e-4"),
        *[bug(f"u-{i}", "2026-11-20") for i in range(9)],
    ]
    body = get(serve(tmp_path, rows), days="7").json()
    assert [r["id"] for r in body["epics"]] == ["e-2", "e-1", "e-3", None]
    by_id = {r["id"]: r for r in body["epics"]}
    assert (by_id["e-3"]["opened"], by_id["e-3"]["closed"], by_id["e-3"]["open_now"]) == (0, 0, 1)
    assert sum(r["opened"] for r in body["epics"]) == body["figures"]["opened"]


# REQ-REPORTS-042
# TC: TC-REPORTS-098@5286724c
def test_tc_reports_098_open_bugs_list(tmp_path: Path) -> None:
    rows = [
        bug("b-1", "2026-10-13", status="deferred", priority=2),
        bug("b-2", "2026-11-22", priority=3),
        bug("b-3", "2026-11-22", priority=1),
        shut("b-4", "2026-11-20", "2026-11-21"),
    ]
    api = serve(tmp_path, rows)
    for days in ("7", "90"):
        open_bugs = get(api, days=days).json()["open"]
        assert [(b["id"], b["age_days"]) for b in open_bugs] == [
            ("b-1", 43),
            ("b-3", 3),
            ("b-2", 3),
        ]
        assert set(open_bugs[0]) == {"id", "title", "priority", "assignee", "age_days", "epic"}
