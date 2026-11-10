from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from fake_bd import FakeBd
from report_beads import closed, row, usage

from gin_console.reports.models import CoverageBead, EstimateRow, Point, Report, Stat, WipRow
from gin_console.reports.service import build_report
from gin_console.reports.source import read_beads

NOW = datetime(2026, 11, 2, 12, 0, tzinfo=UTC)  # a Monday


def ago(days: float) -> str:
    return (NOW - timedelta(days=days)).isoformat().replace("+00:00", "Z")


def report(rows: list[Any], *, days: int = 30, sprint: str | None = None) -> Report:
    beads = read_beads(FakeBd(rows), Path("."), "alpha")
    return build_report(beads, now=NOW, project="alpha", days=days, sprint=sprint, errors=[])


# REQ-REPORTS-002
def test_reports_002_epic_with_collected_children() -> None:
    r = report(
        [
            closed(
                "e-1", ago(2), issue_type="epic", ai=usage(stages={"discuss": 1000, "execute": 600})
            ),
            closed("e-1.1", ago(2), parent="e-1", ai=usage(600)),
        ]
    )
    assert {s.stage: s.tokens for s in r.usage.stages} == {"discuss": 1000, "execute": 600}
    assert r.totals.tokens == 1600
    [epic_row] = [b for b in r.usage.beads if b.id == "e-1"]
    assert epic_row.tokens == 1000


def test_reports_002_child_larger_than_its_share_is_clamped() -> None:
    r = report(
        [
            closed("e-1", ago(2), issue_type="epic", ai=usage(500)),
            closed("e-1.1", ago(2), parent="e-1", ai=usage(700)),
        ]
    )
    [epic_row] = [b for b in r.usage.beads if b.id == "e-1"]
    assert epic_row.tokens == 0
    assert r.totals.tokens == 700


def test_reports_002_own_shares_sum_to_the_epic_total() -> None:
    r = report(
        [
            closed(
                "e-1",
                ago(2),
                issue_type="epic",
                ai=usage(stages={"discuss": 900, "execute": 450, "review": 150}),
            ),
            closed("e-1.1", ago(2), parent="e-1", ai=usage(200)),
            closed("e-1.2", ago(2), parent="e-1", ai=usage(stages={"execute": 250, "review": 150})),
        ]
    )
    assert r.totals.tokens == 1500
    assert {s.stage: s.tokens for s in r.usage.stages} == {
        "discuss": 900,
        "execute": 450,
        "review": 150,
    }


def test_reports_002_epic_cost_roles_and_quality_are_reduced_by_its_children() -> None:
    r = report(
        [
            closed(
                "e-1",
                ago(2),
                issue_type="epic",
                assignee="ann",
                ai=usage(100, cost=1.0, reopens=2),
            ),
            closed(
                "e-1.1", ago(2), parent="e-1", assignee="bob", ai=usage(40, cost=0.4, reopens=1)
            ),
        ]
    )
    own = {b.id: b for b in r.usage.beads}
    assert own["e-1"].tokens == 60 and own["e-1"].cost == pytest.approx(0.6)
    assert own["e-1.1"].cost == pytest.approx(0.4)
    [model_row] = r.usage.models
    assert model_row.tokens == 100 and model_row.cost == pytest.approx(1.0)
    ann, bob = r.quality.members
    assert (ann.key, ann.reopens, bob.key, bob.reopens) == ("ann", 1, "bob", 1)
    [epic_quality] = r.quality.epics
    assert epic_quality.reopens == 2


def test_reports_002_unpriced_model_has_no_cost() -> None:
    unpriced = report([closed("a-1", ago(2), ai=usage(300, cost=None))])
    assert unpriced.totals.tokens == 300 and unpriced.totals.cost is None
    priced = report([closed("a-1", ago(2), ai=usage(300, cost=0.5))])
    assert priced.totals.cost == 0.5


def test_reports_002_only_direct_children_are_subtracted() -> None:
    r = report(
        [
            closed("e-1", ago(2), issue_type="epic", ai=usage(1000)),
            closed("t-1", ago(2), parent="e-1", ai=usage(400)),
            closed("t-1.1", ago(2), parent="t-1", ai=usage(100)),
        ]
    )
    own = {b.id: b.tokens for b in r.usage.beads}
    assert own == {"e-1": 600, "t-1": 400, "t-1.1": 100}


# REQ-REPORTS-001 (service part)
def test_reports_001_period_counts_beads_closed_in_the_last_days() -> None:
    r = report([closed("a-1", ago(3)), closed("a-2", ago(20)), closed("a-3", ago(40))])
    assert r.totals.closed == 2


def test_reports_001_sprint_takes_the_labelled_epic_tree_whatever_the_date() -> None:
    r = report(
        [
            row("a-1", issue_type="epic", labels=["sprint:s7"]),
            closed("a-1.1", ago(50), parent="a-1", ai=usage(100)),
            row("a-2", issue_type="epic"),
            closed("a-2.1", ago(1), parent="a-2", ai=usage(100)),
        ],
        sprint="s7",
    )
    assert r.totals.closed == 1
    assert [b.id for b in r.usage.beads] == ["a-1.1"]


# REQ-REPORTS-003
def test_reports_003_member_rows() -> None:
    r = report(
        [
            closed("a-1", ago(2), assignee="ann", ai=usage(100)),
            closed("a-2", ago(2), assignee="ann", ai=usage(300)),
            closed("a-3", ago(2), ai=usage(50)),
        ]
    )
    ann, nobody = r.usage.members
    assert (ann.member, ann.closed, ann.tokens, ann.tokens_per_bead) == ("ann", 2, 400, 200.0)
    assert (nobody.member, nobody.closed, nobody.tokens) == ("Unassigned", 1, 50)


def test_reports_003_open_epic_with_closed_children() -> None:
    r = report(
        [
            row("a-1", issue_type="epic"),
            closed("a-1.1", ago(2), parent="a-1", ai=usage(200)),
            closed("a-1.2", ago(2), parent="a-1", ai=usage(200)),
        ]
    )
    [epic] = r.usage.epics
    assert (epic.id, epic.tokens, epic.children, epic.closed_children, epic.budget) == (
        "a-1",
        400,
        2,
        2,
        None,
    )


def test_reports_003_stage_order_and_cache_ratio() -> None:
    ai = usage(stages={"zeta": 1, "verify": 1, "quick": 1, "alpha": 1, "discuss": 1})
    ai["models"]["m"] = {
        "input": 10,
        "output": 5,
        "cache_read": 80,
        "cache_write": 10,
        "cost": None,
    }
    r = report([closed("a-1", ago(2), assignee="ann", ai=ai)])
    assert [s.stage for s in r.usage.stages] == ["discuss", "verify", "quick", "alpha", "zeta"]
    assert r.usage.members[0].cache_ratio == 0.8


def test_reports_003_top_ten_epics_and_beads() -> None:
    r = report(
        [closed(f"e-{n}", ago(2), issue_type="epic", ai=usage(100 * (n + 1))) for n in range(12)]
    )
    assert len(r.usage.epics) == 10 and len(r.usage.beads) == 10
    assert r.usage.epics[0].id == "e-11" and r.usage.beads[0].tokens == 1200


def test_reports_003_nested_epics_roll_up() -> None:
    r = report(
        [
            closed("e-1", ago(2), issue_type="epic", ai=usage(300)),
            closed("e-2", ago(2), issue_type="epic", parent="e-1", ai=usage(200)),
            closed("t-1", ago(2), parent="e-2", ai=usage(100)),
        ]
    )
    assert {e.id: e.tokens for e in r.usage.epics} == {"e-1": 300, "e-2": 200}
    assert {q.key: q.beads for q in r.quality.epics} == {"e-1": 3, "e-2": 2}


def test_reports_003_total_cache_ratio() -> None:
    a = usage(100)
    a["models"]["m"] = {
        "input": 100,
        "output": 0,
        "cache_read": 300,
        "cache_write": 0,
        "cost": None,
    }
    b = usage(100)
    b["models"]["m"] = {"input": 100, "output": 0, "cache_read": 0, "cache_write": 0, "cost": None}
    r = report([closed("a-1", ago(2), ai=a), closed("a-2", ago(2), ai=b)])
    assert r.totals.cache_ratio == 0.6


def test_reports_003_total_cache_ratio_absent_without_reads() -> None:
    r = report([closed("a-1", ago(2), ai=usage(100))])
    assert r.totals.cache_ratio is None


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
    beads = read_beads(FakeBd([closed("a-1", "2026-11-02T05:00:00+07:00")]), Path("."), "alpha")
    r = build_report(beads, now=now, project="alpha", days=7, sprint=None, errors=[])
    weeks = {w.week: w.counts for w in r.delivery.weeks}
    assert weeks["2026-W44"] == {"task": 1}
    assert "2026-W45" not in weeks


def test_reports_004_work_in_progress() -> None:
    r = report(
        [
            row("a-1", status="in_progress", assignee="ann", started_at=ago(10)),
            row("a-2", status="in_progress", assignee="ann", started_at=ago(2)),
            row("a-3", status="in_progress", assignee="bob", updated_at=ago(5)),
            closed("a-4", ago(1), assignee="ann", started_at=ago(3)),
            row("a-5", status="in_progress", assignee="cat", started_at=ago(60)),
        ]
    )
    assert r.delivery.wip == [
        WipRow(member="ann", count=2),
        WipRow(member="bob", count=1),
        WipRow(member="cat", count=1),
    ]
    assert [(b.id, b.age_days) for b in r.delivery.oldest] == [
        ("a-5", 60.0),
        ("a-1", 10.0),
        ("a-3", 5.0),
        ("a-2", 2.0),
    ]


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


# REQ-REPORTS-005
def test_reports_005_rework_rate_and_findings() -> None:
    rows = [closed(f"a-{n}", ago(2), assignee="ann", ai=usage(100)) for n in range(3)]
    rows.append(
        closed("a-9", ago(2), assignee="ann", ai=usage(100, reopens=1, findings={"critical": 2}))
    )
    [ann] = report(rows).quality.members
    assert ann.reopens == 1 and ann.rework_rate == 0.25
    assert ann.findings.critical == 2 and ann.beads == 4


def test_reports_005_points_hold_non_epic_beads() -> None:
    r = report(
        [
            closed("t-1", ago(2), ai=usage(900, reopens=1, rejections=2)),
            closed("e-1", ago(2), issue_type="epic", ai=usage(100)),
        ]
    )
    assert r.quality.points == [
        Point(project="alpha", id="t-1", title="Title of t-1", tokens=900, rework=3)
    ]


# REQ-REPORTS-006
def test_reports_006_not_collected() -> None:
    r = report([closed("a-9", ago(2))])
    assert r.coverage.not_collected == [
        CoverageBead(
            project="alpha",
            id="a-9",
            title="Title of a-9",
            detail="gin usage collect --bead a-9",
        )
    ]
    assert r.totals.tokens == 0 and r.totals.tokens_per_bead is None


def test_reports_006_unreadable_usage_is_listed() -> None:
    r = report([closed("a-1", ago(2), ai='{"version": 2}'), closed("a-2", ago(2), ai="nope")])
    assert [(c.id, c.detail) for c in r.coverage.invalid] == [
        ("a-1", "version 2"),
        ("a-2", "unreadable"),
    ]
    assert r.coverage.not_collected == [] and r.totals.tokens == 0


def test_reports_006_unpriced_unassigned_share_and_sources() -> None:
    odd = usage(100)
    odd["sources"] = {"claude_code": "ok", "codex": "missing"}
    r = report(
        [closed("a-1", ago(2), assignee="ann", ai=usage(300)), closed("a-2", ago(2), ai=odd)]
    )
    assert r.coverage.unpriced == ["m"]
    assert r.coverage.unassigned_share == 0.25
    assert [s.id for s in r.coverage.sources] == ["a-2"]


def test_reports_006_sprint_lists_open_unreadable_usage() -> None:
    r = report(
        [
            row("a-1", issue_type="epic", labels=["sprint:s7"]),
            row("a-1.1", parent="a-1", ai="nope"),
            row("a-1.2", parent="a-1"),
            row("a-2", ai="nope"),
        ],
        sprint="s7",
    )
    assert [(c.id, c.detail) for c in r.coverage.invalid] == [("a-1.1", "unreadable")]
    assert r.coverage.not_collected == []
