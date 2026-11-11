"""Canned gin output and beads rows, and a stand-in for subprocess.run."""

import json
import subprocess
from typing import Any

STATE = {
    "stage": "plan",
    "gates": {"requirement_confirmed": "satisfied"},
    "project": {"layout": "sdd"},
}
# e3 waits on e1, which is in progress: e3 is blocked, e2 and t1 are ready
ISSUES: list[dict[str, Any]] = [
    {"id": "e1", "title": "Epic one", "issue_type": "epic", "status": "in_progress"},
    {"id": "e2", "title": "Epic two", "issue_type": "epic", "status": "open"},
    {
        "id": "e3",
        "title": "Epic three",
        "issue_type": "epic",
        "status": "open",
        "dependencies": [{"issue_id": "e3", "depends_on_id": "e1", "type": "blocks"}],
    },
    {"id": "t1", "title": "Task", "issue_type": "task", "status": "open"},
    {"id": "c1", "title": "Done", "issue_type": "task", "status": "closed"},
]


class Fake:
    def __init__(self, fail: dict[str, Exception | int] | None = None) -> None:
        self.calls: list[list[str]] = []
        self.envs: list[dict[str, str]] = []
        self.fail = fail or {}

    def __call__(self, cmd: list[str], **kwargs: Any) -> "subprocess.CompletedProcess[str]":
        self.calls.append(cmd)
        self.envs.append(kwargs.get("env", {}))
        failure = self.fail.get(cmd[0])
        if isinstance(failure, Exception):
            raise failure
        if failure:
            return subprocess.CompletedProcess(cmd, failure, "", "boom")
        outputs: dict[str, Any] = {"state": STATE}
        return subprocess.CompletedProcess(cmd, 0, json.dumps(outputs[cmd[1]]), "")
