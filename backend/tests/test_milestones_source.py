import json
import subprocess
from datetime import date
from pathlib import Path
from typing import Any

import pytest
from fake_gw import LIST, SHOW, FakeGw

from gin_console.milestones.source import (
    MilestonesError,
    list_milestones,
    run_gw,
    show_milestone,
)

CWD = Path("/p")
# an old gin-workflow: the usage line alone is longer than the 200 characters CollectError keeps
COMMANDS = "setup,state,unblock,record,quick-check,rules,specs,team,usage,reviewer,hooks"
OLD = (
    f"usage: gin-workflow [-h] {{{COMMANDS},task,routes,notify,paths,goal,worktree}} ...\n"
    f"gin-workflow: error: argument command: invalid choice: 'milestone' (choose from {COMMANDS})\n"
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
    assert str(caught.value) == "gin-workflow reports milestone schema 2"


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
