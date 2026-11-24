from datetime import UTC, date, datetime

import pytest
from fastapi.responses import JSONResponse
from report_beads import closed, row, snap

from gin_console.reports.models import TeamMilestone
from gin_console.reports.router import parse_scope
from gin_console.reports.scope import (
    MilestoneScope,
    PeriodScope,
    _Tree,
    period_scope,
    select_milestone,
)
from gin_console.reports.source import read_beads

NOW = datetime(2026, 11, 12, 12, 0, tzinfo=UTC)
TODAY = date(2026, 11, 12)


def listed(ident: str, status: str, start: str, end: str) -> TeamMilestone:
    return TeamMilestone(
        id=ident,
        title=ident,
        status=status,  # type: ignore[arg-type]
        start=date.fromisoformat(start),
        end=date.fromisoformat(end),
        closed_on=None,
    )


# REQ-REPORTS-001, REQ-REPORTS-008
def test_reports_008_parse_scope_neither_key() -> None:
    assert parse_scope(None, None) is None


# REQ-REPORTS-001, REQ-REPORTS-008
def test_reports_008_parse_scope_milestone_or_period() -> None:
    assert parse_scope("m2", None) == MilestoneScope("m2")
    assert parse_scope(None, "90") == PeriodScope(90)


# REQ-REPORTS-001, REQ-REPORTS-008
@pytest.mark.parametrize(
    ("milestone", "days"),
    [("m1", "7"), (None, "14"), (None, ""), ("a b", None), ("", None)],
)
def test_reports_008_parse_scope_bad_input(milestone: str | None, days: str | None) -> None:
    answer = parse_scope(milestone, days)
    assert isinstance(answer, JSONResponse) and answer.status_code == 422


# REQ-REPORTS-008
def test_reports_008_select_milestone() -> None:
    ms = [
        listed("m1", "closed", "2026-10-05", "2026-10-30"),
        listed("m2", "active", "2026-11-02", "2026-11-27"),
    ]
    assert select_milestone(ms, "m1", TODAY) == ms[0]
    assert select_milestone(ms, "gone", TODAY) == ms[1]
    assert select_milestone(ms, None, TODAY) == ms[1]
    assert select_milestone([], "m1", TODAY) is None


# REQ-REPORTS-009
def test_reports_009_period_scope() -> None:
    beads = read_beads(
        snap(
            [
                closed("t10", "2026-11-02T12:00:00Z"),
                closed("t40", "2026-10-03T12:00:00Z"),
                row("ip", status="in_progress"),
                row("op"),
                row("m", issue_type="milestone"),
                row("e", issue_type="epic"),
                closed("e.1", "2026-11-03T12:00:00Z", parent="e"),
            ]
        ),
        "alpha",
        {},
    )
    pairs = period_scope(_Tree(beads), beads, 30, NOW)
    assert [(b.id, epic.id) for b, epic in pairs] == [
        ("e.1", "e"),
        ("ip", "ip"),
        ("t10", "t10"),
    ]
