"""The bugs report (REQ-REPORTS-040, 041, 042, and the period of 039), built from export rows."""

from datetime import UTC, date, datetime
from typing import Any

from fake_export import dep
from report_beads import closed, row, snap

from gin_console.reports.bugs import build_bugs
from gin_console.reports.models import BugsReport
from gin_console.reports.scope import MilestoneScope, PeriodScope, Scope
from gin_console.reports.source import read_beads

NOW = datetime(2026, 11, 25, 12, tzinfo=UTC)  # the local date is 2026-11-25 in any zone


def at(day: str) -> str:
    """A noon stamp, so the local date is `day` in every time zone from -11 to +11."""
    return f"{day}T12:00:00Z"


def bug(ident: str, day: str = "2026-11-24", **fields: Any) -> dict[str, Any]:
    return row(ident, issue_type="bug", created_at=at(day), **fields)


def closed_bug(ident: str, made: str, done: str, **fields: Any) -> dict[str, Any]:
    return closed(ident, at(done), issue_type="bug", created_at=at(made), **fields)


def found(ident: str, *targets: str, **fields: Any) -> dict[str, Any]:
    deps = [dep(ident, t, "discovered-from") for t in targets]
    return bug(ident, dependencies=deps, **fields)


def milestone(ident: str, start: str, end: str, **fields: Any) -> dict[str, Any]:
    meta = {"start": start, "end": end}
    return row(ident, issue_type="milestone", metadata=meta, **fields)


def report(
    rows: list[dict[str, Any]], scope: Scope | None = None, now: datetime = NOW
) -> BugsReport:
    beads = read_beads(snap(rows), "alpha", {})
    return build_bugs(beads, now=now, project="alpha", scope=scope)


def epic_of(rows: list[dict[str, Any]]) -> dict[str, str | None]:
    """The source epic id of each open bug."""
    return {b.id: b.epic.id if b.epic else None for b in report(rows).open}


# REQ-REPORTS-040
def test_req_reports_040_linked_to_a_track() -> None:
    rows = [
        row("e-1", issue_type="epic"),
        row("t-1", parent="e-1"),
        found("b-1", "t-1"),
    ]
    assert epic_of(rows) == {"b-1": "e-1"}


# REQ-REPORTS-040
def test_req_reports_040_linked_to_an_epic() -> None:
    rows = [
        row("e-1", issue_type="epic"),
        row("e-2", issue_type="epic", parent="e-1"),
        found("b-2", "e-2"),
    ]
    assert epic_of(rows) == {"b-2": "e-2"}


# REQ-REPORTS-040
def test_req_reports_040_link_wins_over_parents() -> None:
    rows = [
        row("e-1", issue_type="epic"),
        row("e-2", issue_type="epic"),
        row("t-2", parent="e-2"),
        found("b-3", "t-2", parent="e-1"),
    ]
    assert epic_of(rows) == {"b-3": "e-2"}


# REQ-REPORTS-040
def test_req_reports_040_first_link_that_reaches_an_epic() -> None:
    rows = [
        row("e-3", issue_type="epic"),
        row("t-0"),
        row("t-9", parent="e-3"),
        found("b-4", "t-9", "t-5", "t-0"),
    ]
    assert epic_of(rows) == {"b-4": "e-3"}


# REQ-REPORTS-040
def test_req_reports_040_links_are_tried_in_id_order() -> None:
    rows = [
        row("e-1", issue_type="epic"),
        row("e-2", issue_type="epic"),
        found("b-1", "e-2", "e-1"),
    ]
    assert epic_of(rows) == {"b-1": "e-1"}


# REQ-REPORTS-040
def test_req_reports_040_a_merge_gate_target_is_missing() -> None:
    rows = [
        row("e-1", issue_type="epic"),
        row("g-1", title="external: .planning/plans/p.md#1", parent="e-1"),
        found("b-1", "g-1"),
    ]
    assert epic_of(rows) == {"b-1": None}


# REQ-REPORTS-040
def test_req_reports_040_discovered_from_another_bug() -> None:
    rows = [
        row("e-1", issue_type="epic"),
        row("t-1", parent="e-1"),
        found("b-6", parent="e-1"),
        found("b-5", "b-6"),
        found("b-8", "t-1"),
        found("b-7", "b-8"),
    ]
    assert epic_of(rows) == {"b-5": "e-1", "b-6": "e-1", "b-7": None, "b-8": "e-1"}


# REQ-REPORTS-040
def test_req_reports_040_parents_only() -> None:
    rows = [
        row("e-1", issue_type="epic"),
        row("t-1", parent="e-1"),
        bug("b-9", parent="t-1"),
    ]
    assert epic_of(rows) == {"b-9": "e-1"}


# REQ-REPORTS-040
def test_req_reports_040_nearest_epic_among_parents() -> None:
    rows = [
        row("e-1", issue_type="epic"),
        row("e-2", issue_type="epic", parent="e-1"),
        bug("b-1", parent="e-2"),
    ]
    assert epic_of(rows) == {"b-1": "e-2"}


# REQ-REPORTS-040
def test_req_reports_040_unknown_and_cycle() -> None:
    rows = [
        bug("b-10"),
        row("t-1", parent="t-2"),
        row("t-2", parent="t-1"),
        bug("b-11", parent="t-1"),
    ]
    assert epic_of(rows) == {"b-10": None, "b-11": None}


# REQ-REPORTS-039
def test_req_reports_039_milestone_period() -> None:
    got = report([milestone("m2", "2026-11-16", "2026-12-04")])
    assert got.today == date(2026, 11, 25)
    assert (got.milestone, got.days) == ("m2", None)
    assert got.period is not None
    assert (got.period.start, got.period.end) == (date(2026, 11, 16), date(2026, 11, 25))


# REQ-REPORTS-039
def test_req_reports_039_closed_milestone_ends_on_its_end() -> None:
    rows = [
        milestone("m1", "2026-10-05", "2026-10-30", status="closed", closed_at=at("2026-10-31")),
        milestone("m2", "2026-11-16", "2026-12-04"),
    ]
    got = report(rows, MilestoneScope("m1"))
    assert got.milestone == "m1"
    assert got.period is not None
    assert (got.period.start, got.period.end) == (date(2026, 10, 5), date(2026, 10, 30))


# REQ-REPORTS-039
def test_req_reports_039_days_period() -> None:
    got = report([milestone("m2", "2026-11-16", "2026-12-04")], PeriodScope(7))
    assert (got.milestone, got.days) == (None, 7)
    assert got.period is not None
    assert (got.period.start, got.period.end) == (date(2026, 11, 18), date(2026, 11, 25))


# REQ-REPORTS-039
def test_req_reports_039_not_started_has_no_period_but_open_bugs() -> None:
    rows = [
        milestone("m3", "2026-12-07", "2026-12-18"),
        bug("b-1", "2026-11-20"),
        closed_bug("b-2", "2026-11-01", "2026-11-10"),
    ]
    got = report(rows, MilestoneScope("m3"))
    assert got.milestone == "m3" and got.period is None
    assert got.weeks == []
    assert (got.figures.opened, got.figures.closed) == (0, 0)
    assert [b.id for b in got.open] == ["b-1"]


# REQ-REPORTS-039
def test_req_reports_039_no_milestones_has_no_period() -> None:
    got = report([bug("b-1")])
    assert (got.milestone, got.days, got.period) == (None, None, None)
    assert [b.id for b in got.open] == ["b-1"]


# REQ-REPORTS-039
def test_req_reports_039_a_merge_gate_is_no_bug() -> None:
    gate = bug("g-1", title="external: .planning/plans/p.md#1")
    got = report([gate, bug("b-1")], PeriodScope(7))
    assert got.figures.total == 1 and [b.id for b in got.open] == ["b-1"]


# REQ-REPORTS-039
def test_req_reports_039_only_bugs_count() -> None:
    rows = [row("t-1", created_at=at("2026-11-24")), bug("b-1")]
    assert report(rows, PeriodScope(7)).figures.total == 1


# REQ-REPORTS-041
def test_req_reports_041_figures() -> None:
    rows = [
        closed_bug("b-1", "2026-11-10", "2026-11-20"),
        closed_bug("b-2", "2026-11-19", "2026-11-20"),
        bug("b-3", "2026-11-20", status="deferred"),
    ]
    f = report(rows, PeriodScope(7)).figures
    assert (f.total, f.opened, f.closed, f.open_now) == (3, 2, 2, 1)
    assert f.oldest_open_days == 5
    assert f.median_close_days == 5.5


# REQ-REPORTS-041
def test_req_reports_041_nothing_open_and_nothing_closed() -> None:
    rows = [closed_bug("b-1", "2026-10-01", "2026-10-05")]
    f = report(rows, PeriodScope(7)).figures
    assert (f.total, f.opened, f.closed, f.open_now) == (1, 0, 0, 0)
    assert f.oldest_open_days is None and f.median_close_days is None


# REQ-REPORTS-041
def test_req_reports_041_median_of_an_odd_count_is_rounded_to_one_decimal() -> None:
    rows = [
        closed_bug("b-1", "2026-11-19", "2026-11-20"),
        closed_bug("b-2", "2026-11-18", "2026-11-21"),
        closed_bug("b-3", "2026-11-18", "2026-11-22"),
        closed_bug("b-4", "2026-11-18", "2026-11-24"),
    ]
    # 1, 3, 4 and 6 days: the median is 3.5
    assert report(rows, PeriodScope(7)).figures.median_close_days == 3.5


# REQ-REPORTS-041
def test_req_reports_041_weeks_of_a_period() -> None:
    rows = [
        bug("b-1", "2026-11-17"),
        bug("b-2", "2026-11-18", status="closed", closed_at=at("2026-11-24")),
        bug("b-3", "2026-11-24"),
    ]
    got = report(rows, PeriodScope(7))
    assert [(w.start, w.opened, w.closed) for w in got.weeks] == [
        (date(2026, 11, 16), 1, 0),
        (date(2026, 11, 23), 1, 1),
    ]


# REQ-REPORTS-041
def test_req_reports_041_week_without_bugs_across_a_year_end() -> None:
    rows = [bug("b-1", "2026-12-22"), bug("b-2", "2027-01-05")]
    got = report(rows, PeriodScope(18), now=datetime(2027, 1, 8, 12, tzinfo=UTC))
    assert got.period is not None
    assert (got.period.start, got.period.end) == (date(2026, 12, 21), date(2027, 1, 8))
    assert [(w.start, w.opened, w.closed) for w in got.weeks] == [
        (date(2026, 12, 21), 1, 0),
        (date(2026, 12, 28), 0, 0),
        (date(2027, 1, 4), 1, 0),
    ]


# REQ-REPORTS-041
def test_req_reports_041_weeks_add_up_to_the_figures() -> None:
    rows = [
        bug("b-1", "2026-11-10", status="closed", closed_at=at("2026-11-19")),
        bug("b-2", "2026-11-19", status="closed", closed_at=at("2026-11-25")),
        bug("b-3", "2026-11-23"),
        bug("b-4", "2026-10-01"),
    ]
    got = report(rows, PeriodScope(30))
    assert sum(w.opened for w in got.weeks) == got.figures.opened == 3
    assert sum(w.closed for w in got.weeks) == got.figures.closed == 2


# REQ-REPORTS-041
def test_req_reports_041_odd_close_dates() -> None:
    rows = [
        row("b-1", issue_type="bug", status="closed", created_at=at("2026-11-20")),
        closed_bug("b-2", "2026-11-20", "2026-11-19"),
    ]
    f = report(rows, PeriodScope(7)).figures
    assert f.closed == 1 and f.open_now == 0
    assert f.median_close_days == 0


# REQ-REPORTS-042
def test_req_reports_042_rows_sorted_with_unknown_last() -> None:
    rows = [
        row("e-1", issue_type="epic", title="One"),
        row("e-2", issue_type="epic", title="Two"),
        row("e-3", issue_type="epic", title="Three"),
        bug("b-1", parent="e-1"),
        bug("b-2", parent="e-2"),
        closed_bug("b-3", "2026-11-20", "2026-11-23", parent="e-2"),
        bug("b-4", "2026-10-01", parent="e-3"),
        *[bug(f"u-{n}") for n in range(9)],
    ]
    got = report(rows, PeriodScope(7))
    assert [(e.id, e.title, e.opened, e.closed, e.open_now) for e in got.epics] == [
        ("e-2", "Two", 2, 1, 1),
        ("e-1", "One", 1, 0, 1),
        ("e-3", "Three", 0, 0, 1),
        (None, None, 9, 0, 9),
    ]
    assert sum(e.opened for e in got.epics) == got.figures.opened == 12
    assert sum(e.closed for e in got.epics) == got.figures.closed == 1


# REQ-REPORTS-042
def test_req_reports_042_ties_sort_by_open_now_then_id() -> None:
    rows = [
        row("e-1", issue_type="epic"),
        row("e-2", issue_type="epic"),
        row("e-3", issue_type="epic"),
        bug("b-1", parent="e-3"),
        bug("b-2", parent="e-2"),
        closed_bug("b-3", "2026-11-20", "2026-11-23", parent="e-1"),
        bug("b-4", "2026-10-01", parent="e-1"),
    ]
    # e-1: opened 1 + closed 1 = 2 (1 open); e-2 and e-3: 1 each, 1 open
    got = report(rows, PeriodScope(7))
    assert [e.id for e in got.epics] == ["e-1", "e-2", "e-3"]


# REQ-REPORTS-042
def test_req_reports_042_row_left_out() -> None:
    rows = [
        row("e-4", issue_type="epic"),
        closed_bug("b-1", "2026-10-01", "2026-10-05", parent="e-4"),
        bug("b-2", parent="e-1"),
    ]
    assert [e.id for e in report(rows, PeriodScope(7)).epics] == [None]


# REQ-REPORTS-042
def test_req_reports_042_open_bugs() -> None:
    rows = [
        bug("b-1", "2026-10-13", priority=2, status="deferred"),
        bug("b-2", "2026-11-22", priority=1),
        bug("b-3", "2026-11-22", priority=3),
        closed_bug("b-4", "2026-11-01", "2026-11-02"),
    ]
    got = report(rows)
    assert [(b.id, b.age_days, b.priority) for b in got.open] == [
        ("b-1", 43, 2),
        ("b-2", 3, 1),
        ("b-3", 3, 3),
    ]


# REQ-REPORTS-042
def test_req_reports_042_open_bugs_sort_by_priority_then_id_and_name_the_person() -> None:
    rows = [
        row("e-1", issue_type="epic", title="One"),
        bug("b-3", priority=2, assignee="Ann@Example.com"),
        bug("b-2", priority=2, parent="e-1"),
        bug("b-1", priority=2),
        bug("b-0", priority=None),
    ]
    got = report(rows)
    assert [b.id for b in got.open] == ["b-1", "b-2", "b-3", "b-0"]
    by_id = {b.id: b for b in got.open}
    assert by_id["b-3"].assignee == "ann" and by_id["b-1"].assignee is None
    assert by_id["b-2"].epic is not None
    assert (by_id["b-2"].epic.id, by_id["b-2"].epic.title) == ("e-1", "One")
    assert by_id["b-1"].epic is None


# REQ-REPORTS-042
def test_req_reports_042_open_bugs_ignore_the_period() -> None:
    rows = [bug("b-1", "2026-01-05")]
    got = report(rows, PeriodScope(7))
    assert got.figures.opened == 0 and got.figures.open_now == 1
    assert [b.age_days for b in got.open] == [324]
