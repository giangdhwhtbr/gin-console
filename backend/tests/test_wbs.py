from datetime import UTC, date, datetime
from typing import Any

from fake_export import bead, dep

from gin_console.beads.snapshot import build_snapshot
from gin_console.milestones.models import MilestoneDetail, MilestoneList
from gin_console.milestones.wbs import WbsDocument, WbsRow, build_wbs

NOW = datetime(2026, 11, 24, 9, 0, tzinfo=UTC)


def child(ident: str, parent: str, **extra: Any) -> dict[str, Any]:
    return bead(ident, dependencies=[dep(ident, parent, "parent-child")], **extra)


def ms(ident: str, start: str | None = None, **extra: Any) -> dict[str, Any]:
    meta = {"start": start, "end": "2026-12-31"} if start else {}
    return bead(ident, issue_type="milestone", title=f"MS {ident}", metadata=meta, **extra)


def epic(ident: str, parent: str | None = None, **extra: Any) -> dict[str, Any]:
    if parent is None:
        return bead(ident, issue_type="epic", **extra)
    return child(ident, parent, issue_type="epic", **extra)


def build(
    rows: list[dict[str, Any]],
    *,
    listing: MilestoneList | None = None,
    details: dict[str, MilestoneDetail] | None = None,
    milestone_id: str | None = None,
) -> WbsDocument:
    return build_wbs(
        "alpha",
        build_snapshot(rows),
        listing,
        details or {},
        milestone_id=milestone_id,
        generated_at=NOW,
    )


def by_id(doc: WbsDocument) -> dict[str, WbsRow]:
    return {r.id: r for r in doc.rows}


def plan(ident: str, start: str, end: str, **extra: Any) -> dict[str, Any]:
    return {
        "id": ident,
        "title": ident,
        "status": "open",
        "estimate_days": None,
        "planned_start": start,
        "planned_end": end,
        "depends_on": [],
        "external_depends_on": [],
        "warnings": [],
        **extra,
    }


def detail(ident: str, epics: list[dict[str, Any]]) -> MilestoneDetail:
    return MilestoneDetail.model_validate(
        {
            "id": ident,
            "title": ident,
            "description": "",
            "status": "planned",
            "start": "2026-12-01",
            "end": "2026-12-31",
            "kickoff": None,
            "schedule_start": "2026-12-01",
            "preview": False,
            "today": "2026-11-24",
            "finish": None,
            "overflow_days": 0,
            "epics": epics,
        }
    )


def listing(
    milestones: list[dict[str, Any]] | None = None,
    forecast_epics: list[dict[str, Any]] | None = None,
) -> MilestoneList:
    entries = [
        {
            "id": m["id"],
            "title": m["id"],
            "status": "planned",
            "start": "2026-12-01",
            "end": "2026-12-31",
            "kickoff": None,
            "finish": m.get("finish"),
            "epics": {"total": 0, "closed": 0},
            "warnings": None,
            "error": None,
        }
        for m in milestones or []
    ]
    forecast = {
        "deadline": None,
        "lanes": 1,
        "start": "2026-12-01",
        "finish": None,
        "overflow_days": 0,
        "open_epics": 0,
        "unestimated": 0,
        "error": None,
        "epics": forecast_epics or [],
    }
    return MilestoneList.model_validate(
        {
            "milestones": entries,
            "unassigned_epics": 0,
            "today": "2026-11-24",
            "forecast": forecast,
        }
    )


def milestone_rows() -> list[dict[str, Any]]:
    return [
        ms("m1", "2026-12-01"),
        epic("e1", "m1"),
        epic("e2", "m1"),
        child("t1", "e1", created_at="2026-10-11T10:00:00Z"),
        child("t2", "e1", status="closed", created_at="2026-10-12T10:00:00Z"),
        child("p1", "e1", labels=["prep"]),
        child("g1", "e1", title="external: docs/plan.md#1"),
    ]


def milestone_details() -> dict[str, MilestoneDetail]:
    return {
        "m1": detail(
            "m1",
            [plan("e1", "2026-12-01", "2026-12-04"), plan("e2", "2026-12-05", "2026-12-09")],
        )
    }


# REQ-MILESTONE-UI-027
def test_027_milestone_numbering_and_exclusion_of_prep_and_gates() -> None:
    doc = build(milestone_rows(), details=milestone_details(), milestone_id="m1")
    assert [(r.wbs, r.id) for r in doc.rows] == [
        ("1", "m1"),
        ("1.1", "e1"),
        ("1.1.1", "t1"),
        ("1.1.2", "t2"),
        ("1.2", "e2"),
    ]
    assert [r.level for r in doc.rows] == [1, 2, 3, 3, 2]
    assert by_id(doc)["t1"].parent_id == "e1"
    assert by_id(doc)["m1"].parent_id is None
    assert doc.scope_label == "MS m1"


# REQ-MILESTONE-UI-027
def test_027_epics_ordered_by_planned_start_not_id() -> None:
    details = {
        "m1": detail(
            "m1", [plan("e1", "2026-12-09", "2026-12-12"), plan("e2", "2026-12-01", "2026-12-04")]
        )
    }
    doc = build(milestone_rows(), details=details, milestone_id="m1")
    assert [r.id for r in doc.rows if r.level == 2] == ["e2", "e1"]


# REQ-MILESTONE-UI-027
def test_027_project_root_order_and_depth() -> None:
    rows = [
        ms("m2", "2026-12-20"),
        ms("m1", "2026-12-01"),
        bead("b1", issue_type="bug"),
        epic("e9"),
        child("t1", "e9"),
        child("t1a", "t1"),
    ]
    doc = build(rows)
    numbers = {r.id: r.wbs for r in doc.rows}
    assert numbers == {"m1": "1", "m2": "2", "e9": "3", "b1": "4", "t1": "3.1", "t1a": "3.1.1"}
    assert doc.scope_label == "Project"
    assert doc.milestone_id is None


# REQ-MILESTONE-UI-027
def test_027_root_epics_by_forecast_start_then_priority() -> None:
    rows = [epic("ea", priority=1), epic("eb", priority=3), epic("ec", priority=0)]
    forecast = [
        {"id": "eb", "milestone": None, "planned_start": "2026-12-01", "planned_end": "2026-12-02"},
        {"id": "ea", "milestone": None, "planned_start": "2026-12-05", "planned_end": "2026-12-06"},
    ]
    doc = build(rows, listing=listing(forecast_epics=forecast))
    assert [r.id for r in doc.rows] == ["eb", "ea", "ec"]


# REQ-MILESTONE-UI-027
def test_027_deep_nesting_continues_numbering() -> None:
    rows = [epic("e"), child("a", "e"), child("b", "a"), child("c", "b"), child("d", "c")]
    assert by_id(build(rows))["d"].wbs == "1.1.1.1.1"


# REQ-MILESTONE-UI-027
def test_027_cycle_terminates_and_emits_each_bead_once() -> None:
    rows = [child("a", "b"), child("b", "a")]
    doc = build(rows)
    assert sorted(r.id for r in doc.rows) == ["a", "b"]
    two = build([child("a", "b"), child("b", "a"), child("c", "d"), child("d", "c")])
    assert sorted(r.wbs for r in two.rows if r.level == 1) == ["1", "2"]


# REQ-MILESTONE-UI-027
def test_027_milestones_with_equal_start_ordered_by_id_only() -> None:
    rows = [
        ms("mb", "2026-12-01", priority=0, created_at="2026-10-01T10:00:00Z"),
        ms("ma", "2026-12-01", priority=4, created_at="2026-10-20T10:00:00Z"),
    ]
    assert [r.id for r in build(rows).rows] == ["ma", "mb"]


# REQ-MILESTONE-UI-027
def test_027_empty_scope_is_valid() -> None:
    assert build([]).rows == []
    only = build([ms("m1", "2026-12-01")], milestone_id="m1")
    assert [r.id for r in only.rows] == ["m1"]
    assert build([bead("x")], milestone_id="m1").rows == []


# REQ-MILESTONE-UI-028
def test_028_status_assignee_and_depends_on() -> None:
    rows = [
        ms("m1", "2026-12-01"),
        epic("e1", "m1"),
        child("t2", "e1", priority=1),
        bead(
            "t1",
            owner="alice@example.com",
            assignee=None,
            priority=2,
            dependencies=[
                dep("t1", "e1", "parent-child"),
                dep("t1", "t2", "blocks"),
                dep("t1", "ext-9", "blocks"),
            ],
        ),
        child("t3", "e1", status="in_progress", assignee="Bob@Example.com", priority=3),
        child("t4", "e1", status="hooked", assignee="carol", priority=4),
        child("t5", "e1", status="closed", priority=5),
    ]
    got = by_id(build(rows, milestone_id="m1"))
    t1 = got["t1"]
    assert (t1.status, t1.blocked, t1.assignee, t1.assignee_email) == (
        "Blocked",
        True,
        "Unassigned",
        None,
    )
    assert t1.depends_on_wbs == ["1.1.1", "ext-9"]
    assert t1.depends_on_ids == ["t2", "ext-9"]
    twice = bead(
        "t9",
        dependencies=[dep("t9", "t2", "blocks"), dep("t9", "t2", "blocked-by")],
    )
    dup = by_id(build([bead("t2"), twice]))["t9"]
    assert (dup.depends_on_ids, dup.depends_on_wbs) == (["t2"], ["1"])
    assert got["t2"].status == "Open"
    assert got["t3"].status == "In progress"
    assert (got["t3"].assignee, got["t3"].assignee_email) == ("bob", "Bob@Example.com")
    assert got["t4"].status == "In progress"
    assert (got["t4"].assignee, got["t4"].assignee_email) == ("carol", "carol")
    assert got["t5"].status == "Done"
    assert got["t5"].percent_done == 1.0
    assert got["t2"].percent_done == 0.0
    assert got["t1"].type_label == "Task"
    assert got["e1"].type_label == "Epic"
    assert got["m1"].type_label == "Milestone"
    assert got["t1"].milestone_title == "MS m1"


# REQ-MILESTONE-UI-028
def test_028_task_estimate_from_minutes() -> None:
    rows = [bead("t1", estimated_minutes=960), bead("t2")]
    got = by_id(build(rows))
    assert got["t1"].estimate_days == 2.0
    assert got["t2"].estimate_days is None
    assert got["t1"].planned_start is None
    assert got["t1"].forecast_end is None


# REQ-MILESTONE-UI-028
def test_028_rollups_on_milestone_and_epic() -> None:
    rows = [
        ms("m1", "2026-12-01"),
        epic("e1", "m1", status="closed", closed_at="2026-12-03T15:30:00Z", metadata={"points": 5}),
        epic("e2", "m1", metadata={"points": 3}),
        epic("e3", "m1"),
        child("a", "e2", status="closed"),
        child("b", "e2"),
    ]
    details = {
        "m1": detail(
            "m1",
            [
                plan("e1", "2026-12-01", "2026-12-04", estimate_days=2),
                plan("e2", "2026-12-05", "2026-12-09", estimate_days=1),
                plan("e3", "2026-12-10", "2026-12-12", assumed_days=2),
            ],
        )
    }
    fc = [
        {"id": "e2", "milestone": "m1", "planned_start": "2026-12-05", "planned_end": "2026-12-09"}
    ]
    doc = build(rows, listing=listing([{"id": "m1", "finish": "2026-12-22"}], fc), details=details)
    got = by_id(doc)
    assert got["e1"].percent_done == 1.0
    assert got["e1"].forecast_end == date(2026, 12, 3)
    assert got["e2"].percent_done == 0.5
    assert got["e2"].forecast_end == date(2026, 12, 9)
    assert got["e3"].percent_done == 0.0
    assert (got["e3"].estimate_days, got["e3"].estimate_assumed) == (2.0, True)
    assert (got["e1"].estimate_days, got["e1"].estimate_assumed) == (2.0, False)
    assert (got["e1"].planned_start, got["e1"].planned_end) == (
        date(2026, 12, 1),
        date(2026, 12, 4),
    )
    m1 = got["m1"]
    assert m1.points == 8
    assert m1.estimate_days == 5.0
    assert m1.percent_done == (5 + 1.5) / 8
    assert m1.forecast_end == date(2026, 12, 22)
    assert (m1.planned_start, m1.planned_end) == (date(2026, 12, 1), date(2026, 12, 31))
    assert (got["e1"].points, got["e3"].points) == (5, None)


# REQ-MILESTONE-UI-028
def test_028_milestone_without_points_or_estimates_is_blank() -> None:
    m1 = by_id(build([ms("m1", "2026-12-01"), epic("e1", "m1")], milestone_id="m1"))["m1"]
    assert (m1.points, m1.estimate_days, m1.percent_done) == (None, None, None)


# REQ-MILESTONE-UI-028
def test_028_epic_without_milestone_takes_forecast_dates() -> None:
    fc = [
        {"id": "e9", "milestone": None, "planned_start": "2026-12-01", "planned_end": "2026-12-06"}
    ]
    row = by_id(build([epic("e9")], listing=listing(forecast_epics=fc)))["e9"]
    assert (row.planned_start, row.planned_end, row.forecast_end) == (
        date(2026, 12, 1),
        date(2026, 12, 6),
        date(2026, 12, 6),
    )
    assert row.percent_done == 0.0


# REQ-MILESTONE-UI-028
def test_028_degraded_gin_leaves_gin_fields_blank_but_fills_beads_fields() -> None:
    rows = [ms("m1", "2026-12-01"), epic("e1", "m1", metadata={"points": 3}), child("t1", "e1")]
    doc = build_wbs(
        "alpha",
        build_snapshot(rows),
        None,
        {},
        milestone_id="m1",
        generated_at=NOW,
        warning="gin failed",
    )
    got = by_id(doc)
    assert doc.warning == "gin failed"
    assert (got["e1"].planned_start, got["e1"].estimate_days, got["e1"].forecast_end) == (
        None,
        None,
        None,
    )
    assert got["m1"].planned_start == date(2026, 12, 1)
    assert got["m1"].forecast_end is None
    assert got["m1"].points == 3
    assert [r.id for r in doc.rows] == ["m1", "e1", "t1"]


# REQ-MILESTONE-UI-028
def test_028_blocker_outside_scope_falls_back_to_id() -> None:
    rows = [
        ms("m1", "2026-12-01"),
        epic("e1", "m1"),
        bead("o1"),
        bead(
            "t1",
            dependencies=[dep("t1", "e1", "parent-child"), dep("t1", "o1", "blocked-by")],
        ),
    ]
    got = by_id(build(rows, milestone_id="m1"))
    assert got["t1"].depends_on_wbs == ["o1"]
