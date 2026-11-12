import time
from collections.abc import Iterator
from datetime import UTC, date, datetime
from typing import Any

import pytest
from report_beads import closed, row, snap, usage

from gin_console.reports.models import TeamReport
from gin_console.reports.source import read_beads
from gin_console.reports.team import build_team

NOW = datetime(2026, 11, 12, 12, 0, tzinfo=UTC)  # a Thursday


def ms(
    ident: str,
    start: str,
    end: str,
    *,
    status: str = "open",
    kickoff: str | None = None,
    closed_at: str | None = None,
) -> dict[str, Any]:
    meta = {"start": start, "end": end, **({"kickoff": kickoff} if kickoff else {})}
    return row(ident, issue_type="milestone", status=status, closed_at=closed_at, metadata=meta)


def at(day: str) -> str:
    return f"{day}T12:00:00Z"


def team(rows: list[Any], milestone: str | None = None) -> TeamReport:
    return build_team(
        read_beads(snap(rows), "alpha"), now=NOW, project="alpha", milestone=milestone
    )


def standard() -> list[Any]:
    return [
        ms("m1", "2026-10-05", "2026-10-30", status="closed", closed_at=at("2026-10-31")),
        ms("m2", "2026-11-02", "2026-11-27", kickoff="2026-11-02"),
        ms("m3", "2026-11-30", "2026-12-25"),
    ]


def scoped(milestone: str, epic: str, beads: list[dict[str, Any]]) -> list[Any]:
    return [row(epic, issue_type="epic", parent=milestone), *beads]


# REQ-REPORTS-008
def test_reports_008_status_and_default() -> None:
    r = team(standard())
    assert r.milestone == "m2"
    assert [(m.id, m.status) for m in r.milestones] == [
        ("m1", "closed"),
        ("m2", "active"),
        ("m3", "planned"),
    ]
    assert r.milestones[0].closed_on == date(2026, 10, 31)
    assert r.milestones[1].closed_on is None


# REQ-REPORTS-008
def test_reports_008_scheduled() -> None:
    r = team([ms("m1", "2026-11-16", "2026-11-27", kickoff="2026-11-16")])
    assert r.milestones[0].status == "scheduled"


# REQ-REPORTS-008
def test_reports_008_default_order() -> None:
    held = team([ms("a", "2026-12-01", "2026-12-31"), ms("b", "2026-11-09", "2026-11-20")])
    assert held.milestone == "b"  # the open one whose period holds today
    future = team([ms("a", "2026-12-14", "2026-12-31"), ms("b", "2026-12-01", "2026-12-11")])
    assert future.milestone == "b"  # the earliest future start
    done = team(
        [
            ms("a", "2026-09-01", "2026-09-30", status="closed", closed_at=at("2026-10-01")),
            ms("b", "2026-10-01", "2026-10-30", status="closed", closed_at=at("2026-10-31")),
        ]
    )
    assert done.milestone == "b"  # the latest end among closed


# REQ-REPORTS-008
def test_reports_008_named_and_unknown() -> None:
    assert team(standard(), "m1").milestone == "m1"
    assert team(standard(), "gone").milestone == "m2"


# REQ-REPORTS-008
def test_reports_008_undated() -> None:
    r = team([*standard(), row("x", issue_type="milestone", metadata={"start": "2026-11-01"})])
    assert [m.id for m in r.milestones] == ["m1", "m2", "m3"]
    assert r.undated == 1
    r = team([ms("x", "2026-11-01", "soon")])
    assert r.milestones == []
    assert r.undated == 1


# REQ-REPORTS-008
def test_reports_008_no_milestones() -> None:
    r = team([row("e1", issue_type="epic"), row("t1", parent="e1")])
    assert r.milestones == []
    assert r.milestone is None
    assert r.team is None
    assert (r.members, r.days, r.beads) == ([], [], [])


# REQ-REPORTS-009
def test_reports_009_nested_scope() -> None:
    rows = [
        *standard(),
        row("e1", issue_type="epic", parent="m2"),
        row("e1.1", parent="e1"),
        row("e1.1.1", parent="e1.1"),
        row("e9", issue_type="epic", parent="m3"),
        row("e9.1", parent="e9"),
    ]
    r = team(rows)
    assert [b.id for b in r.beads] == ["e1.1", "e1.1.1"]
    assert {b.epic.id for b in r.beads} == {"e1"}


# REQ-REPORTS-009
def test_reports_009_buckets_and_members() -> None:
    rows = [
        *standard(),
        *scoped(
            "m2",
            "e1",
            [
                row("t1", parent="e1", status="blocked"),
                row("t2", parent="e1", status="deferred", assignee="ann"),
                row("t3", parent="e1", status="in_progress", assignee="bao"),
            ],
        ),
    ]
    r = team(rows)
    by_id = {b.id: b for b in r.beads}
    assert [by_id[i].bucket for i in ("t1", "t2", "t3")] == ["open", "open", "in_progress"]
    assert {m.member: (m.open, m.in_progress) for m in r.members} == {
        "Unassigned": (1, 0),
        "ann": (1, 0),
        "bao": (0, 1),
    }


# REQ-REPORTS-009
def test_reports_009_late_close() -> None:
    rows = [
        *standard(),
        *scoped(
            "m2",
            "e1",
            [
                closed("t1", at("2026-12-01"), parent="e1"),
                closed("t2", at("2026-11-27"), parent="e1"),
            ],
        ),
    ]
    by_id = {b.id: b for b in team(rows).beads}
    assert by_id["t1"].late_days == 2
    assert by_id["t2"].late_days == 0


# REQ-REPORTS-009
def test_reports_009_rework_and_age() -> None:
    rows = [
        *standard(),
        *scoped(
            "m2",
            "e1",
            [
                closed("t1", at("2026-11-05"), parent="e1", ai=usage(10, reopens=1, bugs=1)),
                closed("t2", at("2026-11-05"), parent="e1"),
                row("t3", parent="e1", status="in_progress", started_at=at("2026-11-09")),
            ],
        ),
    ]
    by_id = {b.id: b for b in team(rows).beads}
    assert by_id["t1"].rework == 2
    assert by_id["t2"].rework is None
    assert by_id["t3"].age_days == 3.0


# REQ-REPORTS-010
def test_reports_010_pace() -> None:
    days = ["2026-11-06", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12"]
    beads = [closed(f"c{n}", at(days[n % 5]), parent="e1") for n in range(18)]
    beads += [closed(f"d{n}", at("2026-11-03"), parent="e1") for n in range(9)]
    beads += [row(f"p{n}", parent="e1", status="in_progress") for n in range(10)]
    beads += [row(f"o{n}", parent="e1") for n in range(27)]
    t = team([*standard(), *scoped("m2", "e1", beads)]).team
    assert t is not None
    assert (t.scope, t.closed, t.in_progress, t.open) == (64, 27, 10, 27)
    assert t.throughput == 18
    assert t.pace == 3.6
    assert t.days_left == 11
    assert t.pace_needed == round(37 / 11, 2)
    assert t.elapsed == 9
    assert t.working_days == 20


# REQ-REPORTS-010
def test_reports_010_closed_milestone() -> None:
    rows = [ms("m1", "2026-10-05", "2026-10-30", status="closed", closed_at=at("2026-11-03"))]
    beads = [closed(f"a{n}", at("2026-10-20"), parent="e1") for n in range(51)]
    beads += [
        closed(f"b{n}", at("2026-11-02" if n < 4 else "2026-11-03"), parent="e1") for n in range(7)
    ]
    t = team([*rows, *scoped("m1", "e1", beads)]).team
    assert t is not None
    assert t.throughput == 13.2
    assert t.pace_needed is None
    assert t.on_time == round(51 / 58, 4)


# REQ-REPORTS-010
def test_reports_010_rework_rate() -> None:
    beads = [
        closed("a1", at("2026-11-04"), parent="e1", assignee="ann", ai=usage(1, reopens=1)),
        *[
            closed(f"a{n}", at("2026-11-04"), parent="e1", assignee="ann", ai=usage(1))
            for n in (2, 3, 4)
        ],
        closed("a5", at("2026-11-04"), parent="e1", assignee="ann"),
    ]
    r = team([*standard(), *scoped("m2", "e1", beads)])
    ann = next(m for m in r.members if m.member == "ann")
    assert ann.rework_rate == 0.25
    assert ann.reopens == 1


# REQ-REPORTS-010
def test_reports_010_member_order() -> None:
    beads = [row(f"a{n}", parent="e1", assignee="ann") for n in range(3)]
    beads += [row(f"b{n}", parent="e1", assignee="bao") for n in range(5)]
    beads += [row(f"u{n}", parent="e1") for n in range(6)]
    r = team([*standard(), *scoped("m2", "e1", beads)])
    assert [m.member for m in r.members] == ["bao", "ann", "Unassigned"]


# REQ-REPORTS-010
def test_reports_010_past_end() -> None:
    rows = [ms("m1", "2026-10-26", "2026-11-11", kickoff="2026-10-26")]
    beads = [row(f"o{n}", parent="e1") for n in range(2)]
    beads += [row(f"p{n}", parent="e1", status="in_progress") for n in range(2)]
    t = team([*rows, *scoped("m1", "e1", beads)]).team
    assert t is not None
    assert t.late_open == 4
    assert t.pace_needed is None
    assert t.days_left == 0


# REQ-REPORTS-010
def test_reports_010_blocked_unclaimed() -> None:
    beads = [
        row("t1", parent="e1", status="blocked"),
        row("t2", parent="e1", status="blocked", assignee="ann"),
        row("t3", parent="e1"),
        row("t4", parent="e1", assignee="ann"),
        row("t5", parent="e1", status="in_progress"),
    ]
    t = team([*standard(), *scoped("m2", "e1", beads)]).team
    assert t is not None
    assert t.blocked == 2
    assert t.unclaimed == 2


# REQ-REPORTS-011
def test_reports_011_weekend_close() -> None:
    beads = [closed("t1", at("2026-11-08"), parent="e1", assignee="ann")]
    r = team([*standard(), *scoped("m2", "e1", beads)])
    day = next(d for d in r.days if d.date == date(2026, 11, 6))
    assert day.closed == {"ann": 1}


# REQ-REPORTS-011
def test_reports_011_range() -> None:
    beads = [closed("t1", at("2026-10-30"), parent="e1", assignee="ann")]
    r = team([*standard(), *scoped("m2", "e1", beads)])
    assert len(r.days) == 20
    assert r.days[0].date == date(2026, 11, 2)
    assert r.days[-1].date == date(2026, 11, 27)
    assert r.days[0].closed == {"ann": 1}


# REQ-REPORTS-008
def test_reports_008_invalid_dates() -> None:
    r = team([*standard(), ms("bad", "2026-13-45", "2026-12-31")])
    assert [m.id for m in r.milestones] == ["m1", "m2", "m3"]
    assert r.undated == 1
    r = team([ms("k", "2026-11-02", "2026-11-27", kickoff="2026-02-30")])
    assert r.milestones[0].status == "planned"


@pytest.fixture
def vietnam_time(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    monkeypatch.setenv("TZ", "Asia/Ho_Chi_Minh")
    time.tzset()
    yield
    monkeypatch.undo()
    time.tzset()


# REQ-REPORTS-011
@pytest.mark.skipif(not hasattr(time, "tzset"), reason="needs time.tzset")
@pytest.mark.usefixtures("vietnam_time")
def test_reports_011_close_date_is_local() -> None:
    # Thursday 20:00 UTC is Friday 03:00 in UTC+7
    beads = [closed("t1", "2026-11-05T20:00:00Z", parent="e1", assignee="ann")]
    r = team([*standard(), *scoped("m2", "e1", beads)])
    day = next(d for d in r.days if d.date == date(2026, 11, 6))
    assert day.closed == {"ann": 1}
