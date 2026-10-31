"""A stand-in for `gin-workflow milestone`: canned schema 1 output, the contract's own examples."""

from pathlib import Path
from typing import Any

LIST: dict[str, Any] = {
    "schema": 1,
    "milestones": [
        {
            "id": "gw-ab1",
            "title": "M1",
            "status": "planned",
            "start": "2026-11-02",
            "end": "2026-12-18",
            "kickoff": None,
            "finish": "2026-12-22",
            "epics": {"total": 6, "closed": 0},
            "warnings": 2,
            "error": None,
        }
    ],
    "unassigned_epics": 3,
    "today": "2026-10-29",
}
SHOW: dict[str, Any] = {
    "schema": 1,
    "id": "gw-ab1",
    "title": "M1",
    "description": "",
    "status": "planned",
    "start": "2026-11-02",
    "end": "2026-12-18",
    "kickoff": None,
    "schedule_start": "2026-11-02",
    "preview": False,
    "today": "2026-10-29",
    "finish": "2026-12-22",
    "overflow_days": 2,
    "epics": [
        {
            "id": "gw-rm-x",
            "title": "X",
            "status": "open",
            "estimate_days": 5,
            "planned_start": "2026-11-02",
            "planned_end": "2026-11-06",
            "depends_on": [],
            "external_depends_on": [{"id": "gw-rm-y", "milestone": "gw-ab0"}],
            "warnings": [{"code": "external_blocker"}],
        }
    ],
}


class FakeGw:
    """`milestone list` answers `outputs["list"]`, `milestone show` answers `outputs["show"]`."""

    def __init__(
        self, outputs: dict[str, Any] | None = None, failure: Exception | None = None
    ) -> None:
        self.outputs = {"list": LIST, "show": SHOW} if outputs is None else outputs
        self.failure = failure
        self.calls: list[list[str]] = []

    def __call__(self, args: list[str], cwd: Path) -> Any:
        self.calls.append(args)
        if self.failure is not None:
            raise self.failure
        return self.outputs[args[1]]
