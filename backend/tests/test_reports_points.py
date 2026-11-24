"""Points delivered and estimate accuracy (REQ-REPORTS-034), through the team report."""

from datetime import UTC, date, datetime
from typing import Any

from gin_console.reports.models import ReportBead, TeamReport
from gin_console.reports.points import actual_days
from gin_console.reports.scope import MilestoneScope, PeriodScope, Scope
from gin_console.reports.team import build_team

NOW = datetime(2026, 11, 12, 12, 0, tzinfo=UTC)  # a Thursday


def at(day: str) -> datetime:
    return datetime.fromisoformat(f"{day}T12:00:00+00:00")


def mk(ident: str, issue_type: str = "task", **fields: Any) -> ReportBead:
    for key in ("created_at", "updated_at", "started_at", "closed_at"):
        if isinstance(fields.get(key), str):
            fields[key] = at(fields[key])
    if fields.get("status") == "closed":
        fields.setdefault("closed_at", at("2026-11-10"))
    fields.setdefault("created_at", at("2026-10-01"))
    fields.setdefault("updated_at", at("2026-10-01"))
    return ReportBead(
        project="alpha",
        id=ident,
        issue_type=issue_type,
        **{"title": f"Title of {ident}", "status": "open", **fields},
    )


def milestone(ident: str, **fields: Any) -> ReportBead:
    return mk(ident, "milestone", start="2026-11-02", end="2026-11-27", **fields)


def epic(ident: str, points: int, parent: str = "m2", **fields: Any) -> ReportBead:
    return mk(ident, "epic", status="closed", points=points, parent=parent, **fields)


def team(beads: list[ReportBead], scope: Scope) -> TeamReport:
    return build_team(beads, now=NOW, project="alpha", scope=scope)


def figures(r: TeamReport) -> dict[str, tuple[float, float | None]]:
    assert r.team is not None
    return {
        "team": (r.team.points_delivered, r.team.accuracy),
        **{m.member: (m.points_delivered, m.accuracy) for m in r.members},
    }


# REQ-REPORTS-034
def test_reports_034_shared_by_tracks() -> None:
    beads = [
        milestone("m2"),
        epic("e-1", 8),
        *[mk(f"t-{n}", parent="e-1", status="closed", assignee="ann") for n in (1, 2, 3)],
        mk("t-4", parent="e-1", status="closed", assignee="bao@example.com"),
    ]
    got = figures(team(beads, MilestoneScope("m2")))
    assert (got["ann"][0], got["bao"][0], got["team"][0]) == (6, 2, 8)


# REQ-REPORTS-034
def test_reports_034_epic_without_tracks() -> None:
    beads = [milestone("m2"), epic("e-2", 3, assignee="chi"), mk("x", parent="m2", assignee="ann")]
    got = figures(team(beads, MilestoneScope("m2")))
    assert got["chi"][0] == 3 and got["team"][0] == 3


# REQ-REPORTS-034
def test_reports_034_shares_rounded_to_one_decimal_and_open_tracks_left_out() -> None:
    beads = [
        milestone("m2"),
        epic("e-1", 5),
        mk("t-1", parent="e-1", status="closed", assignee="ann"),
        mk("t-2", parent="e-1", status="closed", assignee="bao"),
        mk("t-3", parent="e-1", status="closed"),
        mk("t-4", parent="e-1", status="in_progress", assignee="chi"),
        mk("t-5", parent="e-1", status="closed", assignee="chi", labels=["prep"]),
    ]
    got = figures(team(beads, MilestoneScope("m2")))
    assert (got["ann"][0], got["bao"][0], got["Unassigned"][0], got["team"][0]) == (
        1.7,
        1.7,
        1.7,
        5,
    )
    assert got["chi"][0] == 0.0  # a member row with no delivered share


# REQ-REPORTS-034
def test_reports_034_milestone_today_and_period() -> None:
    beads = [
        milestone("m2"),
        epic("in", 3, assignee="ann", closed_at="2026-10-01"),
        epic("elsewhere", 5, parent="m3", assignee="ann"),
        mk("unpointed", "epic", status="closed", parent="m2", assignee="ann"),
        mk("open", "epic", parent="m2", points=2, assignee="ann"),
        mk("x", parent="m2", assignee="ann"),
        epic("recent", 2, parent="m3", assignee="bao", closed_at="2026-11-05"),
        epic("old", 8, parent="m3", assignee="bao", closed_at="2026-09-01"),
    ]
    assert figures(team(beads, MilestoneScope("m2")))["team"][0] == 3
    assert figures(team(beads, PeriodScope(30)))["team"][0] == 7  # elsewhere (5) and recent (2)


# REQ-REPORTS-034
def test_reports_034_same_accuracy_as_gin_workflow() -> None:
    # gin-workflow/plugins/gin-workflow/src/scripts/workflow_core/milestone.py `velocity`:
    # accuracy = round(planned / round(sum(days) / sum(points), 2), 2) = round(1.5 / 1.25, 2)
    beads = [
        milestone("m2", planned_days_per_point=1.5),
        epic("e-1", 5, started_at="2026-11-02", closed_at="2026-11-09"),  # Mon to next Mon: 6
        epic("e-2", 3, started_at="2026-11-02", closed_at="2026-11-05"),  # Mon to Thu: 4
    ]
    assert figures(team(beads, MilestoneScope("m2")))["team"] == (8, 1.2)


# REQ-REPORTS-034
def test_reports_034_accuracy_by_member_and_unmeasured_epics() -> None:
    beads = [
        milestone("m2", planned_days_per_point=2),
        epic("e-1", 4, started_at="2026-11-02", closed_at="2026-11-05"),  # 4 days
        mk("t-1", parent="e-1", status="closed", assignee="ann"),
        mk("t-2", parent="e-1", status="closed", assignee="bao"),
        epic("e-2", 8, assignee="ann"),  # no started_at: not measured, still delivered
    ]
    got = figures(team(beads, MilestoneScope("m2")))
    assert got["team"] == (12, 2.0)  # 2 / (4 / 4) rounded
    assert got["ann"] == (10, 2.0) and got["bao"] == (2, 2.0)


# REQ-REPORTS-034
def test_reports_034_no_accuracy() -> None:
    measured = {"started_at": "2026-11-02", "closed_at": "2026-11-05"}
    plain = [milestone("m2"), epic("e-1", 4, assignee="ann", **measured)]
    assert figures(team(plain, MilestoneScope("m2"))) == {"team": (4, None), "ann": (4, None)}
    planned = [
        milestone("m2", planned_days_per_point=1.5),
        epic("e-1", 4, assignee="ann", **measured),
    ]
    got = figures(team(planned, PeriodScope(30)))
    assert got == {"team": (4, None), "ann": (4, None)}
    assert figures(
        team([milestone("m2", planned_days_per_point=1.5), epic("e-1", 4)], MilestoneScope("m2"))
    )["team"] == (4, None)  # no epic with actual days


# REQ-REPORTS-034
def test_reports_034_actual_days() -> None:
    assert actual_days(epic("a", 1, started_at="2026-11-06", closed_at="2026-11-06")) == 1
    assert (
        actual_days(epic("a", 1, started_at="2026-11-07", closed_at="2026-11-08")) == 1
    )  # weekend
    assert actual_days(epic("a", 1, started_at="2026-11-06", closed_at="2026-11-10")) == 3
    assert actual_days(epic("a", 1)) is None
    assert date(2026, 11, 6).weekday() == 4
