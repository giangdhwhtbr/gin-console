from datetime import UTC, datetime, timedelta
from typing import Any

from fake_export import dep
from report_beads import closed, row, snap

from gin_console.reports.models import EpicQuality, EstimateRow, QualityRow, Report, Stat
from gin_console.reports.service import build_report
from gin_console.reports.source import read_beads

NOW = datetime(2026, 11, 2, 12, 0, tzinfo=UTC)  # a Monday


def ago(days: float) -> str:
    return (NOW - timedelta(days=days)).isoformat().replace("+00:00", "Z")


def report(
    rows: list[Any],
    *,
    days: int = 30,
    sprint: str | None = None,
    reopens: dict[str, int] | None = None,
) -> Report:
    beads = read_beads(snap(rows), "alpha", reopens or {})
    return build_report(beads, now=NOW, project="alpha", days=days, sprint=sprint)


# REQ-REPORTS-001 (service part)
def test_reports_001_period_counts_beads_closed_in_the_last_days() -> None:
    r = report([closed("a-1", ago(3)), closed("a-2", ago(20)), closed("a-3", ago(40))])
    assert r.totals.closed == 2


def test_reports_001_sprint_takes_the_labelled_epic_tree_whatever_the_date() -> None:
    r = report(
        [
            row("a-1", issue_type="epic", labels=["sprint:s7"]),
            closed("a-1.1", ago(50), parent="a-1"),
            row("a-2", issue_type="epic"),
            closed("a-2.1", ago(1), parent="a-2"),
        ],
        sprint="s7",
    )
    assert r.totals.closed == 1


# REQ-REPORTS-001
def test_reports_001_merge_gates_left_out() -> None:
    gate = "external: .planning/plans/x.md#2"
    r = report(
        [
            closed("a-1", ago(3)),
            closed("g-1", ago(3), title=gate),
            row("e-1", issue_type="epic", labels=["sprint:s7"]),
            closed("g-2", ago(50), parent="e-1", title=gate),
            closed("a-2", ago(50), parent="e-1"),
        ]
    )
    assert r.totals.closed == 1
    sprint = report(
        [
            row("e-1", issue_type="epic", labels=["sprint:s7"]),
            closed("g-2", ago(50), parent="e-1", title=gate),
            closed("a-2", ago(50), parent="e-1"),
        ],
        sprint="s7",
    )
    assert sprint.totals.closed == 1


# REQ-REPORTS-004
def test_reports_004_percentiles() -> None:
    rows = [
        closed(f"a-{n}", ago(5), started_at=ago(5 + d), created_at=ago(5 + d))
        for n, d in enumerate([1, 2, 3, 4, 10])
    ]
    [task] = report(rows).delivery.by_type
    assert task.key == "task" and task.cycle == Stat(n=5, median=3.0, p85=6.4)


def test_reports_004_missing_start_and_inverted_times() -> None:
    r = report([closed("a-1", ago(5), created_at=ago(9))])
    [task] = r.delivery.by_type
    assert task.cycle is None and task.lead is not None
    assert sum(sum(w.counts.values()) for w in r.delivery.weeks) == 1
    inverted = report([closed("a-1", ago(5), started_at=ago(1), created_at=ago(9))])
    assert inverted.delivery.by_type[0].cycle is None
    assert inverted.delivery.by_type[0].lead is not None


def test_reports_004_overall_over_all_types() -> None:
    r = report(
        [
            closed("a-1", ago(5), started_at=ago(6), created_at=ago(6)),
            closed("b-1", ago(5), issue_type="bug", started_at=ago(8), created_at=ago(8)),
        ]
    )
    overall = r.delivery.overall
    assert overall.key == "all"
    assert overall.cycle is not None and (overall.cycle.n, overall.cycle.median) == (2, 2.0)
    assert overall.lead is not None and overall.lead.median == 2.0


def test_reports_004_overall_absent_when_nothing_closed() -> None:
    r = report([row("a-1", status="open")])
    assert r.delivery.overall.key == "all"
    assert r.delivery.overall.cycle is None and r.delivery.overall.lead is None


def test_reports_004_weeks() -> None:
    r = report([closed("a-1", "2026-10-30T10:00:00Z", issue_type="bug")], days=7)
    assert [w.week for w in r.delivery.weeks] == ["2026-W44", "2026-W45"]
    assert r.delivery.weeks[0].counts == {"bug": 1}


def test_reports_004_weeks_use_utc_dates() -> None:
    # 05:00+07:00 on 2 Nov is still 1 Nov in UTC, the day "now" is on
    now = datetime(2026, 11, 1, 23, 0, tzinfo=UTC)
    beads = read_beads(snap([closed("a-1", "2026-11-02T05:00:00+07:00")]), "alpha", {})
    r = build_report(beads, now=now, project="alpha", days=7, sprint=None)
    weeks = {w.week: w.counts for w in r.delivery.weeks}
    assert weeks["2026-W44"] == {"task": 1}
    assert "2026-W45" not in weeks


# REQ-REPORTS-004
def test_reports_004_no_work_in_progress() -> None:
    r = report([row("a-1", status="in_progress", assignee="ann", started_at=ago(10))])
    dumped = r.delivery.model_dump()
    assert "wip" not in dumped
    assert "oldest" not in dumped


def test_reports_004_estimate_against_working_days() -> None:
    r = report(
        [
            closed(
                "e-1",
                "2026-10-27T17:00:00Z",
                issue_type="epic",
                estimated_minutes=2400,
                created_at="2026-10-19T09:00:00Z",
            ),
            closed("e-2", "2026-10-27T17:00:00Z", issue_type="epic"),
            closed(
                "e-3",
                "2026-10-27T17:00:00Z",
                issue_type="epic",
                estimated_minutes=480,
                created_at="2026-10-01T09:00:00Z",
                started_at="2026-10-26T09:00:00Z",
            ),
        ]
    )
    assert r.delivery.estimates == [
        EstimateRow(
            project="alpha", id="e-1", title="Title of e-1", estimate_days=5.0, actual_days=7
        ),
        EstimateRow(
            project="alpha", id="e-3", title="Title of e-3", estimate_days=1.0, actual_days=2
        ),
    ]


# REQ-REPORTS-004
def test_reports_004_pointed_epic_gives_days_per_point() -> None:
    r = report(
        [
            closed(
                "e-1",
                "2026-11-10T17:00:00Z",
                issue_type="epic",
                created_at="2026-10-01T09:00:00Z",
                started_at="2026-11-02T09:00:00Z",
                metadata={"points": 5},
            ),
            closed("e-2", "2026-11-10T17:00:00Z", issue_type="epic", metadata={"points": 4}),
        ],
        days=60,
    )
    assert r.delivery.estimates == [
        EstimateRow(
            project="alpha",
            id="e-1",
            title="Title of e-1",
            estimate_days=None,
            points=5,
            actual_days=7,
            days_per_point=1.4,
        )
    ]


# REQ-REPORTS-005
def test_reports_005_rework_rate() -> None:
    rows = [closed(f"a-{n}", ago(2), assignee="ann") for n in range(1, 5)]
    r = report(rows, reopens={"a-1": 1})
    assert r.quality.members == [
        QualityRow(member="ann", closed=4, reopens=1, bugs=0, rework_rate=0.25)
    ]
    assert r.totals.rework_rate == 0.25


def test_reports_005_bugs_found_later_count_as_rework() -> None:
    rows = [
        closed("a-1", ago(2), assignee="ann"),
        closed("a-2", ago(2), assignee="ann"),
        row("a-9", issue_type="bug", dependencies=[dep("a-9", "a-1", "discovered-from")]),
    ]
    [ann] = report(rows).quality.members
    assert (ann.reopens, ann.bugs, ann.rework_rate) == (0, 1, 0.5)


def test_reports_005_rework_rate_absent_when_nothing_closed() -> None:
    r = report([row("a-1")])
    assert r.totals.rework_rate is None
    assert r.quality.members == [] and r.quality.epics == []


# REQ-REPORTS-005
def test_reports_005_epic_rows() -> None:
    rows = [
        row("e-1", issue_type="epic"),
        closed("t-1", ago(2), parent="e-1"),
        closed("t-2", ago(2), parent="e-1"),
        row("e-2", issue_type="epic"),
        closed("t-3", ago(2), parent="e-2"),
        closed("t-4", ago(2), parent="e-2"),
    ]
    assert report(rows, reopens={"t-1": 1}).quality.epics == [
        EpicQuality(
            project="alpha",
            id="e-1",
            title="Title of e-1",
            closed=2,
            reopens=1,
            bugs=0,
            rework_rate=0.5,
        ),
        EpicQuality(
            project="alpha",
            id="e-2",
            title="Title of e-2",
            closed=2,
            reopens=0,
            bugs=0,
            rework_rate=0.0,
        ),
    ]


def test_reports_005_epic_row_is_the_nearest_epic_and_an_epic_counts_itself() -> None:
    rows = [
        row("e-1", issue_type="epic"),
        closed("t-1", ago(2), parent="e-1.1"),
        closed("e-1.1", ago(2), issue_type="epic", parent="e-1"),
    ]
    assert [(e.id, e.closed) for e in report(rows).quality.epics] == [("e-1.1", 2)]


def test_reports_005_top_ten_epics_by_rework_then_closed_then_id() -> None:
    rows: list[Any] = []
    for n in range(12):
        rows += [
            row(f"e-{n:02d}", issue_type="epic"),
            closed(f"t-{n:02d}", ago(2), parent=f"e-{n:02d}"),
        ]
    reopens = {"t-11": 3, "t-10": 1, "t-05": 1}
    ids = [e.id for e in report(rows, reopens=reopens).quality.epics]
    assert ids == ["e-11", "e-05", "e-10", "e-00", "e-01", "e-02", "e-03", "e-04", "e-06", "e-07"]


def test_reports_005_members_by_closed_then_name_with_unassigned_last() -> None:
    rows = [
        closed("a-1", ago(2)),
        closed("a-2", ago(2)),
        closed("a-3", ago(2)),
        closed("a-4", ago(2), assignee="bao"),
        closed("a-5", ago(2), assignee="ann"),
        closed("a-6", ago(2), assignee="cat"),
        closed("a-7", ago(2), assignee="cat"),
    ]
    assert [m.member for m in report(rows).quality.members] == ["cat", "ann", "bao", "Unassigned"]


def test_reports_005_ai_usage_in_metadata_is_ignored() -> None:
    ai = {"version": 1, "quality": {"reopens": 5}}
    r = report([closed("a-1", ago(2), assignee="ann", metadata={"ai_usage": ai})])
    [ann] = r.quality.members
    assert (ann.reopens, ann.rework_rate) == (0, 0.0)
