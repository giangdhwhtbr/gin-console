from datetime import UTC, datetime
from typing import Any

from fake_export import bead, dep

from gin_console.beads.snapshot import build_snapshot
from gin_console.overview.models import ProjectOverview
from gin_console.overview.service import build_overview

NOW = datetime(2026, 11, 20, 12, 0, tzinfo=UTC)  # a Friday
TUESDAY = datetime(2026, 11, 24, 12, 0, tzinfo=UTC)


def overview(rows: list[dict[str, Any]], now: datetime = NOW) -> ProjectOverview:
    return build_overview(build_snapshot(rows), "alpha", aging_days=3, now=now, stale=False)


def child(ident: str, parent: str, **fields: Any) -> dict[str, Any]:
    return bead(ident, dependencies=[dep(ident, parent, "parent-child")], **fields)


# REQ-OVERVIEW-002
def test_overview_002_wait_days_and_blocker_person() -> None:
    found = overview(
        [
            bead("t-8", assignee="bao@example.com"),
            bead(
                "t-3",
                dependencies=[dep("t-3", "t-8", "blocks")],
                updated_at="2026-11-16T10:00:00Z",
            ),
        ]
    )
    [blocked] = found.blocked
    assert (blocked.id, blocked.days) == ("t-3", 4)
    assert blocked.blocker is not None
    assert (blocked.blocker.id, blocked.blocker.person) == ("t-8", "bao")


# REQ-OVERVIEW-002
def test_overview_002_blocked_through_its_parent() -> None:
    found = overview(
        [
            bead("a-1", assignee="bao@example.com"),
            bead("e-1", issue_type="epic", dependencies=[dep("e-1", "a-1", "blocks")]),
            child("e-1.1", "e-1"),
        ]
    )
    assert {b.id: b.blocker.id if b.blocker else None for b in found.blocked} == {
        "e-1": "a-1",
        "e-1.1": "a-1",
    }
    assert all(b.blocker and b.blocker.person == "bao" for b in found.blocked)


# REQ-OVERVIEW-002
def test_overview_002_status_only_has_no_blocker() -> None:
    found = overview([bead("b-1", status="blocked")])
    assert [(b.id, b.blocker) for b in found.blocked] == [("b-1", None)]


# REQ-OVERVIEW-002
def test_overview_002_prep_and_milestones_left_out_and_order() -> None:
    found = overview(
        [
            bead("p-1", status="blocked", labels=["prep"]),
            bead("m1", issue_type="milestone", status="blocked"),
            bead("b-2", status="blocked", updated_at="2026-11-18T10:00:00Z"),
            bead("b-1", status="blocked", updated_at="2026-11-18T10:00:00Z"),
            bead("b-3", status="blocked", updated_at="2026-11-10T10:00:00Z"),
        ]
    )
    assert [b.id for b in found.blocked] == ["b-3", "b-1", "b-2"]


# REQ-OVERVIEW-003
def test_overview_003_above_the_threshold() -> None:
    found = overview(
        [
            bead("a", status="in_progress", started_at="2026-11-16T10:00:00Z"),
            bead("b", status="in_progress", started_at="2026-11-18T10:00:00Z"),
        ]
    )
    assert [(b.id, b.days) for b in found.aging] == [("a", 4)]


# REQ-OVERVIEW-003
def test_overview_003_weekend_not_counted() -> None:
    found = overview([bead("a", status="in_progress", started_at="2026-11-19T10:00:00Z")], TUESDAY)
    assert found.aging == []
    assert [b.id for b in found.in_progress] == ["a"]


# REQ-OVERVIEW-003
def test_overview_003_blocked_and_split_epics_left_out() -> None:
    found = overview(
        [
            bead("x", status="in_progress", started_at="2026-11-02T10:00:00Z"),
            bead(
                "y",
                status="in_progress",
                started_at="2026-11-02T10:00:00Z",
                dependencies=[dep("y", "x", "blocks")],
            ),
            bead("e-1", issue_type="epic", status="in_progress", started_at="2026-11-02T10:00:00Z"),
            child("e-1.1", "e-1", status="open"),
        ]
    )
    assert [b.id for b in found.aging] == ["x"]


# REQ-OVERVIEW-003
def test_overview_003_no_start_recorded_uses_updated_at() -> None:
    found = overview([bead("a", status="in_progress", updated_at="2026-11-13T10:00:00Z")])
    assert [(b.id, b.days) for b in found.aging] == [("a", 5)]


# REQ-OVERVIEW-003
def test_overview_003_order_longest_first_then_id() -> None:
    found = overview(
        [
            bead("b", status="in_progress", started_at="2026-11-09T10:00:00Z"),
            bead("a", status="in_progress", started_at="2026-11-09T10:00:00Z"),
            bead("c", status="in_progress", started_at="2026-11-02T10:00:00Z"),
        ]
    )
    assert [b.id for b in found.aging] == ["c", "a", "b"]


# REQ-OVERVIEW-004
def test_overview_004_owner_is_not_assignee_and_split_epic_left_out() -> None:
    found = overview(
        [
            bead("e-1", issue_type="epic"),
            child("e-1.1", "e-1", owner="lead@example.com"),
            bead("t-2", assignee="ann"),
        ]
    )
    assert [b.id for b in found.unassigned] == ["e-1.1"]


# REQ-OVERVIEW-004
def test_overview_004_prep_left_out_and_order_by_priority_then_id() -> None:
    found = overview(
        [
            bead("p-1", labels=["prep"]),
            bead("t-2", priority=2),
            bead("t-1", priority=2),
            bead("t-3", priority=0),
            bead("t-4", priority=None),
        ]
    )
    assert [b.id for b in found.unassigned] == ["t-3", "t-1", "t-2", "t-4"]


# REQ-OVERVIEW-005
def test_overview_005_in_progress_not_blocked_and_tracked_only() -> None:
    found = overview(
        [
            bead("a", status="in_progress", assignee="ann"),
            bead("b", status="in_progress", dependencies=[dep("b", "a", "blocks")]),
            bead("p-1", status="in_progress", labels=["prep"]),
            bead("e-1", issue_type="epic", status="in_progress"),
            child("e-1.1", "e-1", status="in_progress", assignee="bao"),
        ]
    )
    assert [(b.id, b.assignee) for b in found.in_progress] == [("a", "ann"), ("e-1.1", "bao")]
    assert [e.id for e in found.epics] == ["e-1"]


# REQ-OVERVIEW-006
def test_overview_006_overdue_never_kicked_off_comes_first() -> None:
    found = overview(
        [
            bead(
                "m1",
                issue_type="milestone",
                metadata={"start": "2026-11-02", "end": "2026-11-19"},
            ),
            bead(
                "m2",
                issue_type="milestone",
                metadata={"start": "2026-11-09", "end": "2026-12-18", "kickoff": "2026-11-09"},
            ),
        ]
    )
    assert found.milestone is not None and found.milestone.id == "m1"


# REQ-OVERVIEW-006
def test_overview_006_only_closed_milestones_gives_none() -> None:
    found = overview(
        [
            bead(
                "m1",
                issue_type="milestone",
                status="closed",
                closed_at="2026-11-10T10:00:00Z",
                metadata={"start": "2026-11-02", "end": "2026-11-19"},
            )
        ]
    )
    assert found.milestone is None


# REQ-OVERVIEW-006
def test_overview_006_two_overdue_earliest_end_first() -> None:
    found = overview(
        [
            bead(
                "m1",
                issue_type="milestone",
                metadata={"start": "2026-10-01", "end": "2026-11-12", "kickoff": "2026-10-01"},
            ),
            bead(
                "m2",
                issue_type="milestone",
                metadata={"start": "2026-10-01", "end": "2026-11-05", "kickoff": "2026-10-01"},
            ),
        ]
    )
    assert found.milestone is not None and found.milestone.id == "m2"


# REQ-OVERVIEW-006
def test_overview_006_undated_milestone_is_never_chosen() -> None:
    found = overview([bead("m1", issue_type="milestone")])
    assert found.milestone is None
