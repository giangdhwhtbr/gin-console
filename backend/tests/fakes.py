"""Canned gin-workflow / bd output and a stand-in for subprocess.run."""

import json
import subprocess
from typing import Any

STATE = {
    "stage": "plan",
    "gates": {"requirement_confirmed": "satisfied"},
    "project": {"layout": "sdd"},
}
ISSUES = [
    {"id": "e1", "title": "Epic one", "issue_type": "epic", "status": "in_progress"},
    {"id": "e2", "title": "Epic two", "issue_type": "epic", "status": "open"},
    {"id": "e3", "title": "Epic three", "issue_type": "epic", "status": "open"},
    {"id": "t1", "title": "Task", "issue_type": "task", "status": "open"},
]
READY = [{"id": "e2"}, {"id": "t1"}]
BLOCKED = [{"id": "e3"}]


class Fake:
    def __init__(
        self,
        fail: dict[str, Exception | int] | None = None,
        issues: list[dict[str, str]] | None = None,
    ) -> None:
        self.calls: list[list[str]] = []
        self.envs: list[dict[str, str]] = []
        self.fail = fail or {}
        self.issues = ISSUES if issues is None else issues

    def __call__(self, cmd: list[str], **kwargs: Any) -> "subprocess.CompletedProcess[str]":
        self.calls.append(cmd)
        self.envs.append(kwargs.get("env", {}))
        failure = self.fail.get(cmd[0])
        if isinstance(failure, Exception):
            raise failure
        if failure:
            return subprocess.CompletedProcess(cmd, failure, "", "boom")
        outputs: dict[str, Any] = {
            "state": STATE,
            "list": self.issues,
            "ready": READY,
            "blocked": BLOCKED,
        }
        return subprocess.CompletedProcess(cmd, 0, json.dumps(outputs[cmd[1]]), "")
