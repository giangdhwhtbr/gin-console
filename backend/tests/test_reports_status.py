"""The status report of a milestone or a period (REQ-REPORTS-022 to REQ-REPORTS-026).

`today` is Monday 2026-11-23; the milestone `m2` starts Monday 2026-11-09, is kicked off on
Wednesday 2026-11-11 and ends on Wednesday 2026-12-02, so the week-ago day is Monday 2026-11-16."""

from datetime import UTC, date, datetime
from typing import Any

from report_beads import row, snap

from gin_console.beads.models import ChildCounts
from gin_console.reports.history import parse_moves, parse_points
from gin_console.reports.models import ReportBead, ScopeChange, StatusReport, TeamEpic
from gin_console.reports.scope import MilestoneScope, PeriodScope, Scope
from gin_console.reports.source import read_beads
from gin_console.reports.status import build_status, first_day
from gin_console.reports.team import build_team

NOW = datetime(2026, 11, 23, 12, 0, tzinfo=UTC)
TODAY = date(2026, 11, 23)
WEEK_AGO = date(2026, 11, 16)


def at(day: str) -> datetime:
    return datetime.fromisoformat(f"{day}T12:00:00+00:00")


def mk(ident: str, issue_type: str = "task", **fields: Any) -> ReportBead:
    """A bead; dates are `YYYY-MM-DD` texts, the histories are lists as gin-workflow writes them."""
    for key in ("created_at", "updated_at", "started_at", "closed_at", "blocked_since"):
        if isinstance(fields.get(key), str):
            fields[key] = at(fields[key])
    if "moves" in fields:
        fields["moves"] = parse_moves(fields["moves"])
    if "points_history" in fields:
        fields["points_history"] = parse_points(fields["points_history"])
    if fields.get("status") == "closed":
        fields.setdefault("closed_at", at("2026-11-20"))
    fields.setdefault("created_at", at("2026-11-01"))
    fields.setdefault("updated_at", at("2026-11-01"))
    return ReportBead(
        project="alpha",
        id=ident,
        issue_type=issue_type,
        **{"title": f"Title of {ident}", "status": "open", **fields},
    )


def ms(ident: str, start: str, end: str, kickoff: str | None = None, **fields: Any) -> ReportBead:
    return mk(ident, "milestone", start=start, end=end, kickoff=kickoff, **fields)


M2 = ms("m2", "2026-11-09", "2026-12-02", "2026-11-11")
ON_M2 = MilestoneScope("m2")


def status(beads: list[ReportBead], scope: Scope | None = ON_M2) -> StatusReport:
    return build_status(beads, now=NOW, project="alpha", scope=scope)


def tracks(epic: str, count: int, **fields: Any) -> list[ReportBead]:
    return [mk(f"{epic}.{n}", parent=epic, **fields) for n in range(1, count + 1)]


def burn(r: StatusReport) -> dict[date, tuple[float, float]]:
    return {d.day: (d.scope_points, d.done_points) for d in r.burnup}


def item(r: StatusReport, ident: str, kind: str | None = None) -> ScopeChange:
    found = [c for c in r.changes.items if c.id == ident and kind in (None, c.kind)]
    assert len(found) == 1, found
    return found[0]


# REQ-REPORTS-022
def test_reports_022_first_day_is_the_kickoff_else_the_start() -> None:
    assert first_day(M2) == date(2026, 11, 11)
    assert first_day(ms("m9", "2026-11-09", "2026-12-02")) == date(2026, 11, 9)
    assert first_day(ms("m9", "2026-11-09", "2026-12-02", "soon")) == date(2026, 11, 9)


# REQ-REPORTS-022
def test_reports_022_one_entry_per_working_day_up_to_today() -> None:
    r = status([M2, mk("e-1", "epic", parent="m2", points=8)])
    assert [d.day for d in r.burnup] == [
        date(2026, 11, n) for n in (11, 12, 13, 16, 17, 18, 19, 20, 23)
    ]


# REQ-REPORTS-022
def test_reports_022_splitting_does_not_move_the_scope() -> None:
    epic = mk("e-1", "epic", parent="m2", points=8)
    r = status([M2, epic, *tracks("e-1", 4, created_at="2026-11-12")])
    days = burn(r)
    assert days[date(2026, 11, 11)][0] == days[date(2026, 11, 12)][0] == 8


# REQ-REPORTS-022
def test_reports_022_half_the_tracks_closed() -> None:
    epic = mk("e-1", "epic", parent="m2", points=8, status="closed", closed_at="2026-11-20")
    done = tracks("e-1", 2, created_at="2026-11-12", status="closed", closed_at="2026-11-13")
    rest = [mk(f"e-1.{n}", parent="e-1", created_at="2026-11-12") for n in (3, 4)]
    days = burn(status([M2, epic, *done, *rest]))
    assert days[date(2026, 11, 12)][1] == 0
    assert days[date(2026, 11, 13)][1] == 4
    assert days[date(2026, 11, 19)][1] == 4
    assert days[date(2026, 11, 20)][1] == 8  # the epic is closed


# REQ-REPORTS-022
def test_reports_022_prep_tasks_are_not_tracks() -> None:
    epic = mk("e-1", "epic", parent="m2", points=8)
    work = [
        mk("e-1.1", parent="e-1", created_at="2026-11-12", status="closed", closed_at="2026-11-13"),
        mk("e-1.2", parent="e-1", created_at="2026-11-12"),
        mk("p-1", parent="e-1", created_at="2026-11-12", labels=["prep"]),
        mk("p-2", parent="e-1", created_at="2026-11-12", labels=["prep"], status="closed"),
    ]
    assert burn(status([M2, epic, *work]))[date(2026, 11, 13)][1] == 4


# REQ-REPORTS-022
def test_reports_022_re_estimate_raises_the_scope() -> None:
    history = [
        {"from": None, "to": 5, "at": "2026-11-02T08:00:00Z"},
        {"from": 5, "to": 8, "at": "2026-11-16T08:00:00Z"},
    ]
    epic = mk("e-2", "epic", parent="m2", points=8, points_history=history)
    days = burn(status([M2, epic]))
    assert days[date(2026, 11, 13)][0] == 5
    assert days[date(2026, 11, 16)][0] == 8


# REQ-REPORTS-022
def test_reports_022_only_epics_of_the_milestone_on_that_day() -> None:
    mine = mk("e-1", "epic", parent="m2", points=3)
    other = mk("e-9", "epic", parent="m3", points=13)
    moved = mk(
        "e-4",
        "epic",
        parent="m2",
        points=5,
        created_at="2026-11-02",
        moves=[{"from": None, "to": "m2", "at": "2026-11-18T09:00:00Z"}],
    )
    days = burn(status([M2, mine, other, moved]))
    assert days[date(2026, 11, 17)][0] == 3
    assert days[date(2026, 11, 18)][0] == 8


# REQ-REPORTS-022
def test_reports_022_closed_milestone() -> None:
    m1 = ms("m1", "2026-10-05", "2026-10-30", "2026-10-05", status="closed", closed_at="2026-11-03")
    r = status(
        [m1, mk("e-1", "epic", parent="m1", points=5, created_at="2026-10-01")],
        MilestoneScope("m1"),
    )
    assert r.burnup[0].day == date(2026, 10, 5)
    assert r.burnup[-1].day == date(2026, 11, 3)  # a Tuesday


# REQ-REPORTS-022
def test_reports_022_before_the_first_day() -> None:
    m3 = ms("m3", "2026-12-18", "2027-01-15")
    r = status([M2, m3, mk("e-1", "epic", parent="m3", points=5)], MilestoneScope("m3"))
    assert r.burnup == []
    assert r.changes.scope_from is None and r.changes.items == []
    assert r.kpis.points.scope is None and r.kpis.points.at_kickoff is None


# REQ-REPORTS-022
def test_reports_022_values_round_to_one_decimal() -> None:
    epic = mk("e-1", "epic", parent="m2", points=5)
    done = tracks("e-1", 1, created_at="2026-11-12", status="closed", closed_at="2026-11-13")
    rest = [mk(f"e-1.{n}", parent="e-1", created_at="2026-11-12") for n in (2, 3)]
    assert burn(status([M2, epic, *done, *rest]))[date(2026, 11, 13)][1] == 1.7


# REQ-REPORTS-023
def test_reports_023_change_since_last_week() -> None:
    m = ms("m2", "2026-11-02", "2026-12-02", "2026-11-02")
    work = [
        mk(
            f"t-{n:02d}",
            parent="e-1",
            created_at="2026-11-03" if n < 32 else "2026-11-18",
            **(
                {"status": "closed", "closed_at": "2026-11-13" if n < 7 else "2026-11-20"}
                if n < 13
                else {}
            ),
        )
        for n in range(35)
    ]
    k = status([m, mk("e-1", "epic", parent="m2"), *work]).kpis.beads
    assert (k.done, k.scope, k.done_week_ago, k.scope_week_ago) == (13, 35, 7, 32)


# REQ-REPORTS-023
def test_reports_023_points_since_kickoff() -> None:
    kept = [
        mk("e-a", "epic", parent="m2", points=13),
        mk("e-b", "epic", parent="m2", points=8),
        mk("e-c", "epic", parent="m2", points=3, status="closed", closed_at="2026-11-17"),
        mk(
            "e-d",
            "epic",
            parent="m2",
            points=3,
            created_at="2026-11-02",
            moves=[{"from": None, "to": "m2", "at": "2026-11-18T09:00:00Z"}],
        ),
    ]
    work = [
        mk("e-a.1", parent="e-a", created_at="2026-11-02", status="closed", closed_at="2026-11-17"),
        mk("e-a.2", parent="e-a", created_at="2026-11-02"),
    ]
    k = status([M2, *kept, *work]).kpis.points
    assert (k.done, k.scope, k.at_kickoff) == (9.5, 27, 24)  # 3 + 13 / 2, then 21 + 3 + 3
    assert k.done_week_ago == 0  # the last entry on or before 16 Nov: nothing closed yet


# REQ-REPORTS-023
def test_reports_023_points_a_week_ago_are_the_last_entry_on_or_before() -> None:
    epic = mk("e-a", "epic", parent="m2", points=8, status="closed", closed_at="2026-11-13")
    k = status([M2, epic]).kpis.points
    assert (k.done, k.done_week_ago) == (8, 8)


# REQ-REPORTS-023
def test_reports_023_pace_is_the_team_pace() -> None:
    work = [
        *[mk(f"c{n}", parent="e-1", status="closed", closed_at="2026-11-12") for n in range(3)],
        mk("c3", parent="e-1", status="closed", closed_at="2026-11-16"),
        mk("c4", parent="e-1", status="closed", closed_at="2026-11-09"),  # before the 5 days
        *[mk(f"c{n}", parent="e-1", status="closed", closed_at="2026-11-18") for n in (5, 6)],
        *[mk(f"o{n}", parent="e-1") for n in range(6)],
    ]
    beads = [M2, mk("e-1", "epic", parent="m2"), *work]
    r = status(beads)
    team = build_team(beads, now=NOW, project="alpha", scope=MilestoneScope("m2")).team
    assert team is not None
    assert (r.kpis.pace.pace, r.kpis.pace.pace_needed) == (team.pace, team.pace_needed)
    assert r.kpis.pace.pace == 0.4 and r.kpis.pace.pace_needed == round(6 / 7, 2)
    assert r.kpis.pace.pace_week_ago == 0.8  # 12 Nov x3 and 16 Nov, in the 5 days up to 16 Nov


# REQ-REPORTS-023
def test_reports_023_oldest_wait() -> None:
    work = [
        mk("t-3", parent="e-1", blocked=True, blockers=["t-9"], blocked_since="2026-11-17"),
        mk("t-4", parent="e-1", status="blocked", blocked=True, updated_at="2026-11-19"),
        mk("t-5", parent="e-1"),
    ]
    beads = [M2, mk("e-1", "epic", parent="m2"), *work, mk("t-9")]
    k = status(beads).kpis.blocked
    assert (k.count, k.oldest_days) == (2, 4)  # t-3: 18, 19, 20, 23 Nov; t-4: 20 and 23 Nov


# REQ-REPORTS-023
def test_reports_023_wait_of_a_bead_without_a_blocker_is_its_blocked_ancestors() -> None:
    epic = mk(
        "e-1", "epic", parent="m2", blocked=True, blockers=["t-9"], blocked_since="2026-11-16"
    )
    child = mk("e-1.1", parent="e-1", status="blocked", blocked=True, updated_at="2026-11-20")
    k = status([M2, epic, child, mk("t-9")]).kpis.blocked
    assert (k.count, k.oldest_days) == (1, 5)


# REQ-REPORTS-023
def test_reports_023_no_blocked_bead_has_no_oldest_wait() -> None:
    k = status([M2, mk("e-1", "epic", parent="m2"), mk("t-1", parent="e-1")]).kpis.blocked
    assert (k.count, k.oldest_days) == (0, None)


# REQ-REPORTS-023
def test_reports_023_rework_a_week_ago() -> None:
    work = [mk(f"c{n}", parent="e-1", status="closed", closed_at="2026-11-13") for n in range(8)]
    work += [
        mk("c8", parent="e-1", status="closed", closed_at="2026-11-13", reopens=1).model_copy(
            update={"reopened_on": [date(2026, 11, 12)]}
        ),
        mk("c9", parent="e-1", status="closed", closed_at="2026-11-13", reopens=1).model_copy(
            update={"reopened_on": [date(2026, 11, 18)]}
        ),
        mk("c10", parent="e-1", status="closed", closed_at="2026-11-20"),  # closed after
    ]
    k = status([M2, mk("e-1", "epic", parent="m2"), *work]).kpis.rework
    assert k.rate_week_ago == 0.1
    assert k.rate == round(2 / 11, 4)


# REQ-REPORTS-023
def test_reports_023_an_unknown_bug_date_counts_before_every_day() -> None:
    work = [mk(f"c{n}", parent="e-1", status="closed", closed_at="2026-11-13") for n in range(3)]
    work.append(
        mk("c3", parent="e-1", status="closed", closed_at="2026-11-13", bugs=1).model_copy(
            update={"bug_days": [date.min]}
        )
    )
    assert status([M2, mk("e-1", "epic", parent="m2"), *work]).kpis.rework.rate_week_ago == 0.25


# REQ-REPORTS-023
def test_reports_023_no_close_a_week_ago_has_no_rate() -> None:
    work = [mk("c1", parent="e-1", status="closed", closed_at="2026-11-20")]
    assert status([M2, mk("e-1", "epic", parent="m2"), *work]).kpis.rework.rate_week_ago is None


# REQ-REPORTS-023
def test_reports_023_kicked_off_this_week() -> None:
    m4 = ms("m4", "2026-11-16", "2026-12-11", "2026-11-20")
    work = [
        mk("e-1", "epic", parent="m4", points=5, created_at="2026-11-02"),
        mk("t-1", parent="e-1", created_at="2026-11-20", status="closed", closed_at="2026-11-20"),
        mk("t-2", parent="e-1", created_at="2026-11-20"),
    ]
    k = status([m4, *work], MilestoneScope("m4")).kpis
    assert (k.beads.done, k.beads.scope) == (1, 2)
    assert k.points.scope == 5
    assert k.beads.done_week_ago is None and k.beads.scope_week_ago is None
    assert k.points.done_week_ago is None
    assert k.pace.pace_week_ago is None
    assert k.rework.rate_week_ago is None


# REQ-REPORTS-023
def test_reports_023_period() -> None:
    work = [mk(f"c{n}", status="closed", closed_at="2026-11-18") for n in range(5)]
    work[0] = work[0].model_copy(update={"reopens": 1})
    work += [
        mk("old", status="closed", closed_at="2026-09-01"),
        mk("b-1", status="blocked", blocked=True),
        mk("b-2", blocked=True, labels=["prep"]),
        mk("b-3", blocked=True),
        mk("b-4", "milestone", status="blocked", blocked=True),
        mk("b-5", blocked=True, status="closed", closed_at="2026-09-01"),
    ]
    r = status([M2, *work], PeriodScope(30))
    assert (r.milestone, r.days, r.period) == (None, 30, None)
    assert r.kpis.beads.done == 5
    assert r.kpis.rework.rate == 0.2
    assert r.kpis.blocked.count == 2  # b-1 and b-3: not a prep task, a milestone or closed
    assert r.kpis.blocked.oldest_days is None
    assert r.kpis.beads.scope is None and r.kpis.beads.done_week_ago is None
    assert r.kpis.points.done is None and r.kpis.points.at_kickoff is None
    assert r.kpis.pace.pace is None and r.kpis.pace.pace_needed is None
    assert r.kpis.rework.rate_week_ago is None
    assert (r.burnup, r.changes.items, r.risks.blocked, r.risks.unestimated, r.epics) == (
        [],
        [],
        [],
        [],
        [],
    )
    assert r.changes.scope_from is None and r.risks.blocked_more == 0


# REQ-REPORTS-023
def test_reports_023_period_without_closes_has_no_rework_rate() -> None:
    r = status([M2, mk("t-1")], PeriodScope(7))
    assert (r.kpis.beads.done, r.kpis.rework.rate) == (0, None)


# REQ-REPORTS-024
def test_reports_024_scope_changes_listed() -> None:
    history = [
        {"from": None, "to": 5, "at": "2026-11-02T08:00:00Z"},
        {"from": 5, "to": 8, "at": "2026-11-16T08:00:00Z"},
    ]
    beads = [
        M2,
        mk("e-2", "epic", parent="m2", points=8, points_history=history),
        mk("t-7", parent="e-2", created_at="2026-11-12"),
        mk("b-1", "bug", parent="t-7", created_at="2026-11-18", assignee="chi@example.com"),
        mk(
            "e-4",
            "epic",
            parent="m2",
            points=3,
            created_at="2026-11-02",
            moves=[{"from": None, "to": "m2", "at": "2026-11-18T09:00:00Z"}],
        ),
    ]
    r = status(beads)
    assert [(c.day, c.kind, c.id) for c in r.changes.items] == [
        (date(2026, 11, 18), "bug_added", "b-1"),
        (date(2026, 11, 18), "epic_added", "e-4"),
        (date(2026, 11, 16), "re_estimated", "e-2"),
    ]
    bug, added, re_estimated = r.changes.items
    assert (bug.epic, bug.person) == (TeamEpic(id="e-2", title="Title of e-2"), "chi")
    assert added.points == 3
    assert (re_estimated.before, re_estimated.after) == (5, 8)
    assert re_estimated.model_dump(by_alias=True)["from"] == 5
    assert re_estimated.model_dump(by_alias=True)["to"] == 8
    assert (r.changes.scope_from, r.changes.scope_to) == (5, 11)


# REQ-REPORTS-024
def test_reports_024_a_bug_without_assignee_is_unassigned() -> None:
    beads = [
        M2,
        mk("e-1", "epic", parent="m2"),
        mk("b-1", "bug", parent="e-1", created_at="2026-11-12"),
    ]
    assert item(status(beads), "b-1").person == "Unassigned"


# REQ-REPORTS-024
def test_reports_024_a_bug_before_the_kickoff_or_a_task_is_no_item() -> None:
    beads = [
        M2,
        mk("e-1", "epic", parent="m2"),
        mk("b-1", "bug", parent="e-1", created_at="2026-11-11"),
        mk("t-1", parent="e-1", created_at="2026-11-18"),
    ]
    assert status(beads).changes.items == []


# REQ-REPORTS-024
def test_reports_024_first_estimate_after_the_kickoff() -> None:
    history = [{"from": None, "to": 5, "at": "2026-11-17T08:00:00Z"}]
    beads = [M2, mk("e-6", "epic", parent="m2", points=5, points_history=history)]
    c = item(status(beads), "e-6")
    assert (c.kind, c.day, c.before, c.after) == ("estimated", date(2026, 11, 17), None, 5)


# REQ-REPORTS-024
def test_reports_024_an_estimate_of_an_epic_of_another_milestone_is_no_item() -> None:
    history = [{"from": None, "to": 5, "at": "2026-11-17T08:00:00Z"}]
    beads = [M2, mk("e-6", "epic", parent="m3", points=5, points_history=history)]
    assert status(beads).changes.items == []


# REQ-REPORTS-024
def test_reports_024_an_epic_created_under_the_milestone_after_the_kickoff_is_added() -> None:
    beads = [M2, mk("e-8", "epic", parent="m2", points=2, created_at="2026-11-17")]
    c = item(status(beads), "e-8")
    assert (c.kind, c.day, c.points) == ("epic_added", date(2026, 11, 17), 2)


# REQ-REPORTS-024
def test_reports_024_split_is_not_a_change() -> None:
    epic = mk("e-1", "epic", parent="m2", points=8)
    beads = [M2, epic, *tracks("e-1", 4, created_at="2026-11-12")]
    assert status(beads).changes.items == []


# REQ-REPORTS-024
def test_reports_024_moved_out() -> None:
    moves = [{"from": "m2", "to": "m3", "at": "2026-11-20T10:00:00Z"}]
    beads = [M2, mk("e-5", "epic", parent="m3", points=5, moves=moves)]
    c = item(status(beads), "e-5")
    assert (c.kind, c.day, c.points) == ("epic_removed", date(2026, 11, 20), 5)


# REQ-REPORTS-024
def test_reports_024_the_same_day_lists_ids_in_order() -> None:
    moves = [{"from": None, "to": "m2", "at": "2026-11-18T10:00:00Z"}]
    beads = [mk(f"e-{n}", "epic", parent="m2", points=1, moves=moves) for n in (9, 3, 5)]
    r = status([M2, *beads])
    assert [c.id for c in r.changes.items] == ["e-3", "e-5", "e-9"]


# REQ-REPORTS-024
def test_reports_024_nothing_on_the_first_day() -> None:
    m = ms("m5", "2026-11-23", "2026-12-18", "2026-11-23")
    r = status(
        [m, mk("e-1", "epic", parent="m5", points=3, created_at="2026-11-23")], MilestoneScope("m5")
    )
    assert r.changes.items == []
    assert (r.changes.scope_from, r.changes.scope_to) == (3, 3)


# REQ-REPORTS-025
def test_reports_025_blocked_chain() -> None:
    beads = [
        M2,
        mk("e-1", "epic", parent="m2"),
        mk(
            "t-3",
            parent="e-1",
            blocked=True,
            blockers=["t-8"],
            blocked_since="2026-11-17",
            title="End-to-end checkout QA",
        ),
        mk(
            "t-8",
            title="Mobile layout",
            assignee="bao@example.com",
            blocked=True,
            blockers=["t-9"],
        ),
        mk("t-9"),
    ]
    first = status(beads).risks.blocked[0]
    assert (first.id, first.title, first.days) == ("t-3", "End-to-end checkout QA", 4)
    assert first.blocker is not None
    assert (first.blocker.id, first.blocker.title) == ("t-8", "Mobile layout")
    assert (first.blocker.person, first.blocker.blocked) == ("bao", True)


# REQ-REPORTS-025
def test_reports_025_the_blocker_is_the_first_open_one_by_id() -> None:
    beads = [
        M2,
        mk("e-1", "epic", parent="m2"),
        mk("t-3", parent="e-1", blocked=True, blockers=["t-8", "t-7"], blocked_since="2026-11-17"),
        mk("t-7"),
        mk("t-8"),
    ]
    blocker = status(beads).risks.blocked[0].blocker
    assert blocker is not None and (blocker.id, blocker.person, blocker.blocked) == (
        "t-7",
        "Unassigned",
        False,
    )


# REQ-REPORTS-025
def test_reports_025_blocked_by_status_only() -> None:
    beads = [
        M2,
        mk("e-1", "epic", parent="m2"),
        mk("t-4", parent="e-1", status="blocked", blocked=True),
    ]
    risk = status(beads).risks.blocked[0]
    assert (risk.id, risk.blocker) == ("t-4", None)


# REQ-REPORTS-025
def test_reports_025_a_bead_without_blocker_takes_its_blocked_ancestors() -> None:
    epic = mk(
        "e-1", "epic", parent="m2", blocked=True, blockers=["t-8"], blocked_since="2026-11-17"
    )
    child = mk("e-1.1", parent="e-1", status="blocked", blocked=True)
    risk = status([M2, epic, child, mk("t-8")]).risks.blocked[0]
    assert (risk.id, risk.days) == ("e-1.1", 4)
    assert risk.blocker is not None and risk.blocker.id == "t-8"


# REQ-REPORTS-025
def test_reports_025_more_than_five() -> None:
    since = ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-18", "2026-11-19", "2026-11-19"]
    since.append("2026-11-20")  # b1 to b7 wait 5, 4, 3, 3, 2, 2 and 1 working days
    blocked = [
        mk(f"b{n}", parent="e-1", status="blocked", blocked=True, updated_at=since[n - 1])
        for n in (7, 3, 1, 4, 2, 6, 5)
    ]
    r = status([M2, mk("e-1", "epic", parent="m2"), *blocked])
    assert [(b.id, b.days) for b in r.risks.blocked] == [
        ("b1", 5),
        ("b2", 4),
        ("b3", 3),
        ("b4", 3),
        ("b5", 2),
    ]
    assert r.risks.blocked_more == 2
    assert r.kpis.blocked.count == 7


# REQ-REPORTS-025
def test_reports_025_unestimated_epics() -> None:
    beads = [
        M2,
        mk("e-7", "epic", parent="m2"),
        mk("e-5", "epic", parent="m2"),
        mk("e-3", "epic", parent="m2", status="closed"),
        mk("e-4", "epic", parent="m2", points=3),
        mk("e-9", "epic", parent="m3"),
    ]
    assert status(beads).risks.unestimated == [
        TeamEpic(id="e-5", title="Title of e-5"),
        TeamEpic(id="e-7", title="Title of e-7"),
    ]


# REQ-REPORTS-026
def test_reports_026_epic_rows() -> None:
    counts = ChildCounts(total=4, closed=2)
    beads = [
        M2,
        mk("e-3", "epic", parent="m2", status="closed", closed_at="2026-11-20"),
        mk("e-1", "epic", parent="m2", points=8, assignee="lead@example.com", child_counts=counts),
        mk("e-9", "epic", parent="m3", points=5),
        mk(
            "e-5",
            "epic",
            parent="m3",
            moves=[{"from": "m2", "to": "m3", "at": "2026-11-20T10:00:00Z"}],
        ),
    ]
    rows = status(beads).epics
    assert [r.id for r in rows] == ["e-1", "e-3"]
    e1, e3 = rows
    assert (e1.title, e1.status, e1.points, e1.person) == ("Title of e-1", "open", 8, "lead")
    assert (e1.child_counts.total, e1.child_counts.closed, e1.closed_on) == (4, 2, None)
    assert (e3.status, e3.points, e3.person) == ("closed", None, "Unassigned")
    assert e3.closed_on == date(2026, 11, 20)
    assert e3.child_counts == ChildCounts()


# REQ-REPORTS-021
def test_reports_021_broken_history_still_builds_the_report() -> None:
    rows = [
        row("m2", issue_type="milestone", metadata={"start": "2026-11-09", "end": "2026-12-02"}),
        row(
            "e-7",
            issue_type="epic",
            parent="m2",
            created_at="2026-11-03T10:00:00Z",
            metadata={"points": 5, "points_history": "oops", "milestone_moves": [{"to": "m3"}]},
        ),
    ]
    beads = read_beads(snap(rows), "alpha", {})
    r = status(beads)
    assert [(e.id, e.points) for e in r.epics] == [("e-7", 5)]
    assert burn(r)[date(2026, 11, 9)] == (5, 0)


# REQ-REPORTS-020
def test_reports_020_period_of_a_milestone() -> None:
    r = status([M2, mk("e-1", "epic", parent="m2")])
    assert r.period is not None
    assert (r.period.kickoff, r.period.working_days, r.period.elapsed, r.period.days_left) == (
        date(2026, 11, 11),
        18,
        11,
        7,
    )
    assert r.milestone == "m2" and r.days is None and r.today == TODAY
    assert [m.id for m in r.milestones] == ["m2"]


# REQ-REPORTS-020
def test_reports_020_no_kickoff_is_null() -> None:
    m = ms("m3", "2026-12-18", "2027-01-15")
    r = status([m], MilestoneScope("m3"))
    assert r.period is not None and r.period.kickoff is None


# REQ-REPORTS-020
def test_reports_020_no_milestones() -> None:
    r = status([mk("t-1", blocked=True)], None)
    assert (r.milestone, r.days, r.period, r.burnup, r.epics) == (None, None, None, [], [])
    assert r.kpis.blocked.count == 0


# REQ-REPORTS-024
def test_reports_024_an_entry_without_before_and_after_is_no_item() -> None:
    history = [{"from": None, "to": None, "at": "2026-11-17T08:00:00Z"}]
    beads = [M2, mk("e-6", "epic", parent="m2", points_history=history)]
    assert status(beads).changes.items == []
