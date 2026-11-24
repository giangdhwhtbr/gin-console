from datetime import date, datetime

import pytest
from fake_export import dep
from report_beads import row, snap

from gin_console.beads.source import BeadsError
from gin_console.reports.models import ReportBead
from gin_console.reports.source import read_beads


# REQ-REPORTS-001
def test_reports_001_reads_the_fields_a_report_needs() -> None:
    rows = [row("a-1", assignee="ann", started_at="2026-10-12T10:00:00Z")]
    [only] = read_beads(snap(rows), "alpha", {})
    assert only.project == "alpha" and only.assignee == "ann" and only.started_at is not None


# REQ-REPORTS-002
def test_reports_002_parent_comes_from_the_parent_child_row() -> None:
    rows = [
        row("e-1", issue_type="epic"),
        row("e-1.1", dependencies=[dep("e-1.1", "e-1", "parent-child")]),
    ]
    assert [(b.id, b.parent) for b in read_beads(snap(rows), "alpha", {})] == [
        ("e-1", None),
        ("e-1.1", "e-1"),
    ]


# REQ-REPORTS-001
def test_reports_001_bad_rows_are_left_out() -> None:
    beads = read_beads(snap([row("a-1"), {"id": 3}, "junk", row("a-2", title=7)]), "alpha", {})
    assert [b.id for b in beads] == ["a-1"]


def test_reports_007_export_not_a_list() -> None:
    with pytest.raises(BeadsError):
        snap({"error": "boom"})  # type: ignore[arg-type]


# REQ-REPORTS-004
def test_reports_004_points_read_from_metadata() -> None:
    from report_beads import row, snap

    from gin_console.reports.source import read_beads

    rows = [
        row("a-1", metadata={"points": 8}),
        row("a-2", metadata={"points": "8"}),
        row("a-3", metadata={"points": False}),
        row("a-4"),
    ]
    assert [b.points for b in read_beads(snap(rows), "alpha", {})] == [8, None, None, None]


# REQ-REPORTS-019
def test_reports_019_bead_gets_reopens_from_mapping_and_bugs_from_discovered_from() -> None:
    rows = [
        row("a-1"),
        row(
            "a-9",
            issue_type="bug",
            dependencies=[dep("a-9", "a-1", "discovered-from")],
        ),
    ]
    by_id = {b.id: b for b in read_beads(snap(rows), "alpha", {"a-1": [date.min, date.min]})}
    assert (by_id["a-1"].reopens, by_id["a-1"].bugs) == (2, 1)
    assert (by_id["a-9"].reopens, by_id["a-9"].bugs) == (0, 0)


def _by_id(rows: list[dict[str, object]]) -> dict[str, ReportBead]:
    return {b.id: b for b in read_beads(snap(rows), "alpha", {})}


# REQ-REPORTS-021
def test_reports_021_blockers_are_open_beads_it_waits_on() -> None:
    rows = [
        row(
            "a-1",
            dependencies=[
                {**dep("a-1", "a-2", "blocks"), "created_at": "2026-11-18T09:00:00Z"},
                {**dep("a-1", "a-4", "blocked-by"), "created_at": "2026-11-20T09:00:00Z"},
                {**dep("a-1", "a-3", "blocks"), "created_at": "2026-11-10T09:00:00Z"},
                {**dep("a-1", "a-5", "related"), "created_at": "2026-11-01T09:00:00Z"},
            ],
        ),
        row("a-2"),
        row("a-3", status="closed"),
        row("a-4"),
        row("a-5"),
    ]
    one = _by_id(rows)["a-1"]
    assert one.blockers == ["a-2", "a-4"]
    assert one.blocked_since == datetime.fromisoformat("2026-11-18T09:00:00Z")
    assert _by_id(rows)["a-2"].blockers == [] and _by_id(rows)["a-2"].blocked_since is None


# REQ-REPORTS-021
def test_reports_021_bug_days_are_the_dates_of_discovered_from_bugs() -> None:
    rows = [
        row("a-1"),
        row(
            "b-1",
            issue_type="bug",
            created_at="2026-11-18T09:00:00Z",
            dependencies=[dep("b-1", "a-1", "discovered-from")],
        ),
        row(
            "b-2",
            issue_type="bug",
            created_at="2026-11-20T09:00:00Z",
            dependencies=[dep("b-2", "a-1", "discovered-from")],
        ),
        row("t-1", issue_type="task", dependencies=[dep("t-1", "a-1", "discovered-from")]),
    ]
    one = _by_id(rows)["a-1"]
    assert one.bug_days == [
        datetime.fromisoformat("2026-11-18T09:00:00Z").astimezone().date(),
        datetime.fromisoformat("2026-11-20T09:00:00Z").astimezone().date(),
    ]
    assert one.bugs == 2


# REQ-REPORTS-021
def test_reports_021_epic_gets_child_counts() -> None:
    rows = [
        row("e-1", issue_type="epic"),
        row("t-1", dependencies=[dep("t-1", "e-1", "parent-child")]),
        row("t-2", status="closed", dependencies=[dep("t-2", "e-1", "parent-child")]),
    ]
    by_id = _by_id(rows)
    counts = by_id["e-1"].child_counts
    assert counts is not None and (counts.total, counts.closed) == (2, 1)
    assert by_id["t-1"].child_counts is None


# REQ-REPORTS-021
def test_reports_021_milestone_planned_days_per_point() -> None:
    rows = [
        row("m-1", issue_type="milestone", metadata={"planned_days_per_point": 1.5}),
        row("m-2", issue_type="milestone", metadata={"planned_days_per_point": "2"}),
        row("m-3", issue_type="milestone", metadata={"planned_days_per_point": 0}),
        row("m-4", issue_type="milestone", metadata={"planned_days_per_point": True}),
        row("m-5", issue_type="milestone", metadata={"planned_days_per_point": "x"}),
    ]
    assert [b.planned_days_per_point for b in _by_id(rows).values()] == [1.5, 2.0, None, None, None]


# REQ-REPORTS-021
def test_reports_021_history_read_from_metadata_text_or_list_and_broken_is_ignored() -> None:
    moves = '[{"from": null, "to": "m-1", "at": "2026-11-18T09:00:00Z"}]'
    rows = [
        row(
            "e-1",
            issue_type="epic",
            metadata={"milestone_moves": moves, "points_history": "oops"},
        ),
        row(
            "e-2",
            issue_type="epic",
            metadata={"points_history": [{"from": None, "to": 5, "at": "2026-11-10T08:00:00Z"}]},
        ),
    ]
    by_id = _by_id(rows)
    assert [(m.source, m.target) for m in by_id["e-1"].moves] == [(None, "m-1")]
    assert by_id["e-1"].points_history == []
    assert [c.after for c in by_id["e-2"].points_history] == [5]
