import json
from pathlib import Path

import pytest
from fake_bd import FakeBd
from report_beads import row, usage

from gin_console.beads.source import BeadsError
from gin_console.reports.source import read_beads


# REQ-REPORTS-002
def test_reports_002_reads_ai_usage_from_a_json_string(tmp_path: Path) -> None:
    fake = FakeBd([row("a-1", ai=usage(700), assignee="ann", started_at="2026-10-12T10:00:00Z")])
    [only] = read_beads(fake, tmp_path, "alpha")
    assert fake.calls == [(["list", "--all", "--limit", "0", "--json"], tmp_path)]
    assert only.project == "alpha" and only.assignee == "ann" and only.started_at is not None
    assert only.usage is not None and only.usage.models["m"].total == 700
    assert only.usage_problem is None


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
def test_reports_006_unreadable_usage_is_marked_not_raised(
    tmp_path: Path, ai: str, problem: str
) -> None:
    [only] = read_beads(FakeBd([row("a-1", ai=ai)]), tmp_path, "alpha")
    assert only.usage is None and only.usage_problem == problem


def test_reports_006_missing_usage_and_bad_rows(tmp_path: Path) -> None:
    beads = read_beads(FakeBd([row("a-1"), {"id": 3}, "junk"]), tmp_path, "alpha")
    assert [(b.id, b.usage, b.usage_problem) for b in beads] == [("a-1", None, None)]


def test_reports_007_bd_output_not_a_list(tmp_path: Path) -> None:
    with pytest.raises(BeadsError):
        read_beads(FakeBd(output={"error": "boom"}), tmp_path, "alpha")
