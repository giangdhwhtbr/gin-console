"""Canned gin output and beads rows, and a stand-in for subprocess.run."""

import json
import subprocess
import threading
import time
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
    def __init__(
        self,
        fail: dict[str, Exception | int] | None = None,
        state: dict[str, Any] | None = None,
        epic_states: dict[str, dict[str, Any]] | None = None,
        fail_epics: set[str] | None = None,
    ) -> None:
        self.state = state if state is not None else STATE
        self.epic_states = epic_states or {}
        self.fail_epics = fail_epics or set()
        self.running = 0  # concurrent `gin state --workflow-id` calls, now and at most
        self.peak = 0
        self._lock = threading.Lock()
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
        if "--workflow-id" in cmd:
            return self._epic_state(cmd, cmd[cmd.index("--workflow-id") + 1])
        outputs: dict[str, Any] = {"state": self.state}
        return subprocess.CompletedProcess(cmd, 0, json.dumps(outputs[cmd[1]]), "")

    def _epic_state(self, cmd: list[str], epic_id: str) -> "subprocess.CompletedProcess[str]":
        with self._lock:
            self.running += 1
            self.peak = max(self.peak, self.running)
        try:
            time.sleep(0.02)  # let concurrent calls overlap
        finally:
            with self._lock:
                self.running -= 1
        if epic_id in self.fail_epics:
            return subprocess.CompletedProcess(cmd, 1, "", "boom")
        out = json.dumps(self.epic_states.get(epic_id, STATE))
        return subprocess.CompletedProcess(cmd, 0, out, "")
