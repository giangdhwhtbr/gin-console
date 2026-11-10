"""Milestones of a project via `gin milestone`; the only module that knows its JSON."""

from datetime import date
from pathlib import Path
from typing import Any, Literal, Protocol

from pydantic import ValidationError

from gin_console.milestones.models import MilestoneDetail, MilestoneList
from gin_console.projects.collect import CollectError, run_json

GW_TIMEOUT = 30.0
SCHEMA = 1
_PREFIX = "milestone error: "
Cause = Literal["outdated", "tracking", "schema"]


class MilestonesError(Exception):
    """gin could not answer; `cause` names a reason the page explains with its fix."""

    def __init__(self, message: str, cause: Cause | None = None) -> None:
        super().__init__(message)
        self.cause: Cause | None = cause


class GwRunner(Protocol):
    def __call__(self, args: list[str], cwd: Path) -> Any: ...


def run_gw(args: list[str], cwd: Path) -> Any:
    try:
        return run_json(["gin", *args], cwd, timeout=GW_TIMEOUT)
    except CollectError as exc:
        if exc.returncode == 2 and "invalid choice: 'milestone'" in exc.stderr:
            raise MilestonesError(
                "this gin has no milestone command", "outdated"
            ) from None
        if "providers.task_tracking: beads" in exc.stderr:
            raise MilestonesError(
                "milestones need providers.task_tracking: beads", "tracking"
            ) from None
        last = exc.stderr.strip().splitlines()[-1:]
        if last and last[0].startswith(_PREFIX):
            raise MilestonesError(last[0].removeprefix(_PREFIX)[:200]) from None
        raise MilestonesError(str(exc)) from None


def _schema_1(data: Any, what: str) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise MilestonesError(f"gin milestone {what} output was not understood")
    if data.get("schema") != SCHEMA:
        raise MilestonesError(
            f"gin reports milestone schema {data.get('schema')}", "schema"
        )
    return data


def list_milestones(run: GwRunner, cwd: Path) -> MilestoneList:
    data = _schema_1(run(["milestone", "list", "--all", "--json"], cwd), "list")
    try:
        return MilestoneList.model_validate(data)
    except ValidationError:
        raise MilestonesError("gin milestone list output was not understood") from None


def show_milestone(
    run: GwRunner, cwd: Path, milestone_id: str, start: date | None
) -> MilestoneDetail:
    when = [] if start is None else ["--start", start.isoformat()]
    data = _schema_1(run(["milestone", "show", milestone_id, *when, "--json"], cwd), "show")
    try:
        return MilestoneDetail.model_validate(data)
    except ValidationError:
        raise MilestonesError("gin milestone show output was not understood") from None
