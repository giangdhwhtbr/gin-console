
import pytest
from fake_export import dep
from report_beads import row, snap

from gin_console.beads.source import BeadsError
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
    by_id = {b.id: b for b in read_beads(snap(rows), "alpha", {"a-1": 2})}
    assert (by_id["a-1"].reopens, by_id["a-1"].bugs) == (2, 1)
    assert (by_id["a-9"].reopens, by_id["a-9"].bugs) == (0, 0)
