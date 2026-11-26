import json
import subprocess
from datetime import date
from pathlib import Path
from typing import Any

import pytest
from fake_export import bead, dep
from fake_gw import LIST, SHOW, FakeGw

from gin_console.beads.snapshot import build_snapshot
from gin_console.milestones.source import (
    MilestonesError,
    closed_epics,
    list_milestones,
    run_gw,
    show_milestone,
    with_epic_states,
)

CWD = Path("/p")
# an old gin-workflow: the usage line alone is longer than the 200 characters CollectError keeps
COMMANDS = "setup,state,unblock,record,quick-check,rules,specs,team,usage,reviewer,hooks"
OLD = (
    f"usage: gin [-h] {{{COMMANDS},task,routes,notify,paths,goal,worktree}} ...\n"
    f"gin: error: argument command: invalid choice: 'milestone' (choose from {COMMANDS})\n"
)


def answer(code: int, stdout: str = "", stderr: str = "") -> Any:
    return lambda cmd, **kwargs: subprocess.CompletedProcess(cmd, code, stdout, stderr)


def cause_of(monkeypatch: pytest.MonkeyPatch, code: int, stderr: str) -> MilestonesError:
    monkeypatch.setattr(subprocess, "run", answer(code, stderr=stderr))
    with pytest.raises(MilestonesError) as caught:
        run_gw(["milestone", "list", "--all", "--json"], CWD)
    return caught.value


# REQ-MILESTONE-UI-008
def test_milestone_ui_008_run_gw_returns_json(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(subprocess, "run", answer(0, stdout=json.dumps(LIST)))
    assert run_gw(["milestone", "list", "--all", "--json"], CWD) == LIST


# REQ-MILESTONE-UI-005
# REQ-MILESTONE-UI-008
def test_milestone_ui_005_old_gin_workflow_is_outdated(monkeypatch: pytest.MonkeyPatch) -> None:
    assert len(OLD.splitlines()[0]) > 100
    assert cause_of(monkeypatch, 2, OLD).cause == "outdated"


# REQ-MILESTONE-UI-005
# REQ-MILESTONE-UI-008
def test_milestone_ui_005_markdown_tracking(monkeypatch: pytest.MonkeyPatch) -> None:
    error = cause_of(
        monkeypatch, 1, "milestone error: milestones need providers.task_tracking: beads\n"
    )
    assert error.cause == "tracking"


# REQ-MILESTONE-UI-008
def test_milestone_ui_008_other_failure_keeps_the_message(monkeypatch: pytest.MonkeyPatch) -> None:
    error = cause_of(monkeypatch, 1, "milestone error: gw-x not found\n")
    assert (error.cause, str(error)) == (None, "gw-x not found")


# REQ-MILESTONE-UI-005
def test_milestone_ui_005_unknown_schema() -> None:
    with pytest.raises(MilestonesError) as caught:
        list_milestones(FakeGw({"list": {**LIST, "schema": 2}}), CWD)
    assert caught.value.cause == "schema"
    assert str(caught.value) == "gin reports milestone schema 2"


# REQ-MILESTONE-UI-008
@pytest.mark.parametrize(
    "output",
    [[], {**LIST, "milestones": [{"id": 1}]}, {**LIST, "forecast": {"lanes": "two"}}],
)
def test_milestone_ui_008_unexpected_output(output: Any) -> None:
    with pytest.raises(MilestonesError) as caught:
        list_milestones(FakeGw({"list": output}), CWD)
    assert caught.value.cause is None


# REQ-MILESTONE-UI-008
def test_milestone_ui_008_commands() -> None:
    fake = FakeGw()
    assert list_milestones(fake, CWD).unassigned_epics == 3
    plan = show_milestone(fake, CWD, "gw-ab1", date(2026, 11, 16))
    assert plan.epics[0].external_depends_on[0].milestone == "gw-ab0"
    show_milestone(fake, CWD, "gw-ab1", None)
    assert fake.calls == [
        ["milestone", "list", "--all", "--json"],
        ["milestone", "show", "gw-ab1", "--start", "2026-11-16", "--json"],
        ["milestone", "show", "gw-ab1", "--json"],
    ]


# REQ-MILESTONE-UI-008
def test_milestone_ui_008_dates_must_be_iso() -> None:
    bad = {**SHOW, "today": "Oct 29"}
    with pytest.raises(MilestonesError):
        show_milestone(FakeGw({"show": bad}), CWD, "gw-ab1", None)


DPP = {"value": 1.4, "measured_epics": 6, "assumed": False}
VELOCITY = {
    "committed_points": 21,
    "completed_points": 13,
    "added_points": 3,
    "say_do": 0.62,
    "days_per_point": 1.4,
    "planned_days_per_point": 1.2,
    "accuracy": 0.86,
}


# REQ-MILESTONE-UI-008
def test_milestone_ui_008_story_points_round_trip() -> None:
    listed = {
        **LIST,
        "days_per_point": DPP,
        "milestones": [{**LIST["milestones"][0], "velocity": VELOCITY}],
    }
    out = list_milestones(FakeGw({"list": listed}), CWD).model_dump()
    assert out["days_per_point"] == DPP
    assert out["milestones"][0]["velocity"] == VELOCITY
    epic = {
        "points": 5,
        "points_reason": "new endpoint",
        "estimate_source": "points",
        "actual_days": 6,
        "actual_days_per_point": 1.2,
    }
    shown = {
        **SHOW,
        "epics": [{**SHOW["epics"][0], **epic}],
        "days_per_point": DPP,
        "velocity": VELOCITY,
    }
    detail = show_milestone(FakeGw({"show": shown}), CWD, "gw-ab1", None).model_dump()
    assert detail["days_per_point"] == DPP and detail["velocity"] == VELOCITY
    assert {k: detail["epics"][0][k] for k in epic} == epic


# REQ-MILESTONE-UI-008
def test_milestone_ui_008_older_gin_output_has_no_points_keys() -> None:
    out = list_milestones(FakeGw(), CWD).model_dump()
    assert out["days_per_point"] is None and out["milestones"][0]["velocity"] is None
    detail = show_milestone(FakeGw(), CWD, "gw-ab1", None).model_dump()
    assert detail["days_per_point"] is None and detail["velocity"] is None
    epic = detail["epics"][0]
    for key in (
        "points",
        "points_reason",
        "estimate_source",
        "actual_days",
        "actual_days_per_point",
    ):
        assert epic[key] is None


def _listing(total: int, closed: int) -> Any:
    entry = {**LIST["milestones"][0], "epics": {"total": total, "closed": closed}}
    return list_milestones(FakeGw({"list": {**LIST, "milestones": [entry]}}), CWD)


def _epic(ident: str, **extra: Any) -> dict[str, Any]:
    return bead(
        ident,
        issue_type="epic",
        dependencies=[dep(ident, "gw-ab1", "parent-child"), *extra.pop("deps", [])],
        **extra,
    )


# REQ-MILESTONE-UI-025
def test_milestone_ui_025_counts_by_state() -> None:
    snapshot = build_snapshot(
        [
            bead("x"),
            bead("gw-ab1", issue_type="milestone"),
            _epic("e-1", status="closed"),
            _epic("e-2", status="in_progress"),
            _epic("e-3", deps=[dep("e-3", "x", "blocks")]),
            _epic("e-4"),
        ]
    )
    result = with_epic_states(_listing(4, 1), snapshot)
    assert result.milestones[0].epics.model_dump() == {
        "total": 4,
        "closed": 1,
        "in_progress": 1,
        "blocked": 1,
        "ready": 1,
        "deferred": 0,
    }


# REQ-MILESTONE-UI-025
def test_milestone_ui_025_bead_missing() -> None:
    result = with_epic_states(_listing(3, 1), None)
    assert result.milestones[0].epics.model_dump() == {
        "total": 3,
        "closed": 1,
        "in_progress": 0,
        "blocked": 0,
        "ready": 2,
        "deferred": 0,
    }
    absent = with_epic_states(_listing(3, 1), build_snapshot([bead("x")]))
    assert absent.milestones[0].epics.ready == 2


def _closed(ident: str, **overrides: Any) -> dict[str, Any]:
    fields = {"closed_at": "2026-10-28T09:00:00Z", **overrides}
    return bead(ident, issue_type="epic", status="closed", labels=["roadmap"], **fields)


# REQ-MILESTONE-UI-008 closed epics
def test_milestone_ui_008_closed_epic_takes_the_nearest_milestone() -> None:
    rows = [
        bead("m1", issue_type="milestone"),
        bead("e-1", issue_type="epic", dependencies=[dep("e-1", "m1", "parent-child")]),
        _closed("e-6", dependencies=[dep("e-6", "e-1", "parent-child")]),
    ]
    assert [(e.id, e.milestone) for e in closed_epics(build_snapshot(rows))] == [("e-6", "m1")]


# REQ-MILESTONE-UI-008 closed epics
def test_milestone_ui_008_closed_epic_without_a_readable_stamp_is_left_out() -> None:
    rows = [
        _closed("e-1", closed_at=None),
        _closed("e-2", closed_at="not a date"),
        _closed("e-3", started_at="garbage"),
        _closed("e-4"),
    ]
    assert [e.id for e in closed_epics(build_snapshot(rows))] == ["e-4"]


# REQ-MILESTONE-UI-008 closed epics
def test_milestone_ui_008_closed_epics_are_ordered_by_start_then_id() -> None:
    rows = [
        _closed("e-b", started_at="2026-10-12T09:00:00Z"),
        _closed("e-c", started_at="2026-10-01T09:00:00Z"),
        _closed("e-a", started_at="2026-10-12T09:00:00Z"),
    ]
    assert [e.id for e in closed_epics(build_snapshot(rows))] == ["e-c", "e-a", "e-b"]
