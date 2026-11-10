import json

import pytest
from fake_bd import dep
from report_beads import row, snap, usage

from gin_console.beads.source import BeadsError
from gin_console.reports.source import read_beads


# REQ-REPORTS-002
def test_reports_002_reads_ai_usage_from_a_json_string() -> None:
    rows = [row("a-1", ai=usage(700), assignee="ann", started_at="2026-10-12T10:00:00Z")]
    [only] = read_beads(snap(rows), "alpha")
    assert only.project == "alpha" and only.assignee == "ann" and only.started_at is not None
    assert only.usage is not None and only.usage.models["m"].total == 700
    assert only.usage_problem is None


# REQ-REPORTS-002
def test_reports_002_parent_comes_from_the_parent_child_row() -> None:
    rows = [
        row("e-1", issue_type="epic"),
        row("e-1.1", dependencies=[dep("e-1.1", "e-1", "parent-child")]),
    ]
    assert [(b.id, b.parent) for b in read_beads(snap(rows), "alpha")] == [
        ("e-1", None),
        ("e-1.1", "e-1"),
    ]


# REQ-REPORTS-006
@pytest.mark.parametrize(
    ("ai", "problem"),
    [
        ("not json", "unreadable"),
        (json.dumps({"version": 2}), "version 2"),
        (json.dumps([1]), "unreadable"),
        (json.dumps({"version": 1, "models": {"m": {"input": "x"}}}), "unreadable"),
    ],
)
def test_reports_006_unreadable_usage_is_marked_not_raised(ai: str, problem: str) -> None:
    [only] = read_beads(snap([row("a-1", ai=ai)]), "alpha")
    assert only.usage is None and only.usage_problem == problem


def test_reports_006_missing_usage_and_bad_rows() -> None:
    beads = read_beads(snap([row("a-1"), {"id": 3}, "junk", row("a-2", title=7)]), "alpha")
    assert [(b.id, b.usage, b.usage_problem) for b in beads] == [("a-1", None, None)]


def test_reports_007_bd_output_not_a_list() -> None:
    with pytest.raises(BeadsError):
        snap({"error": "boom"})  # type: ignore[arg-type]
