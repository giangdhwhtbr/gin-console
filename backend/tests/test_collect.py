import os
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Any

import pytest
from fakes import ISSUES, READY, Fake

from gin_console.projects.collect import Collector
from gin_console.projects.models import Beads, BlockError, Workflow


def patch(monkeypatch: pytest.MonkeyPatch, fake: Any) -> None:
    monkeypatch.setattr(subprocess, "run", fake)


def beads_of(result: Beads | BlockError) -> Beads:
    assert isinstance(result, Beads)
    return result


def workflow_of(result: Workflow | BlockError) -> Workflow:
    assert isinstance(result, Workflow)
    return result


# REQ-SERVER-005
def test_server_005_workflow_shape(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    patch(monkeypatch, Fake())
    workflow, _ = Collector().get("p", tmp_path)
    assert workflow_of(workflow).model_dump() == {
        "stage": "plan",
        "layout": "sdd",
        "gates": {"requirement_confirmed": "satisfied"},
    }


# REQ-SERVER-005
def test_server_005_children_do_not_inherit_console_venv(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv("VIRTUAL_ENV", "/v")
    monkeypatch.setenv("PATH", "/v/bin:/usr/bin")
    fake = Fake()
    patch(monkeypatch, fake)
    Collector().get("p", tmp_path)
    assert fake.envs
    assert all(env["PATH"] == "/usr/bin" and "VIRTUAL_ENV" not in env for env in fake.envs)


# REQ-SERVER-005
def test_server_005_state_json_is_used_despite_exit_code(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    # `gin state` exits 1 for a finished workflow but still prints JSON.
    inner = Fake()

    def run(cmd: list[str], **kwargs: Any) -> "subprocess.CompletedProcess[str]":
        done = inner(cmd, **kwargs)
        if cmd[0] == "gin":
            done.returncode = 1
        return done

    patch(monkeypatch, run)
    workflow, _ = Collector().get("p", tmp_path)
    assert workflow_of(workflow).stage == "plan"


# REQ-SERVER-006
def test_server_006_beads_counts_and_epics(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    fake = Fake()
    patch(monkeypatch, fake)
    _, result = Collector().get("p", tmp_path)
    beads = beads_of(result)
    assert (beads.open, beads.in_progress, beads.blocked, beads.ready) == (3, 1, 1, 2)
    assert [e.id for e in beads.epics] == ["e1", "e2"]
    assert ["bd", "list", "--status", "open,in_progress", "--limit", "0", "--json"] in fake.calls
    assert ["bd", "ready", "--limit", "0", "--json"] in fake.calls


# REQ-SERVER-006
def test_server_006_no_active_epics(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    issues = [{"id": "t1", "title": "T", "issue_type": "task", "status": "open"}]
    patch(monkeypatch, Fake(issues=issues))
    _, result = Collector().get("p", tmp_path)
    assert beads_of(result).epics == []


# REQ-SERVER-007
@pytest.mark.parametrize(
    "failure",
    [
        FileNotFoundError(),
        PermissionError(13, "Permission denied"),
        subprocess.TimeoutExpired("bd", 10),
        1,
    ],
)
def test_server_007_beads_error_isolated(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, failure: Exception | int
) -> None:
    patch(monkeypatch, Fake({"bd": failure}))
    workflow, beads = Collector().get("p", tmp_path)
    assert isinstance(beads, BlockError) and beads.error
    assert workflow_of(workflow).stage == "plan"


# REQ-SERVER-007
def test_server_007_workflow_error_isolated(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    patch(monkeypatch, Fake({"gin": 2}))
    workflow, beads = Collector().get("p", tmp_path)
    assert isinstance(workflow, BlockError) and "gin" in workflow.error
    assert beads_of(beads).ready == 2


# REQ-SERVER-007
def test_server_007_invalid_json(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    patch(
        monkeypatch,
        lambda cmd, **kw: subprocess.CompletedProcess(cmd, 0, "not json", ""),
    )
    workflow, beads = Collector().get("p", tmp_path)
    assert isinstance(workflow, BlockError) and isinstance(beads, BlockError)


# REQ-SERVER-007
def test_server_007_unexpected_shape(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    patch(monkeypatch, lambda cmd, **kw: subprocess.CompletedProcess(cmd, 0, "[{}]", ""))
    workflow, beads = Collector().get("p", tmp_path)
    assert isinstance(workflow, BlockError) and isinstance(beads, BlockError)


# REQ-SERVER-008
def test_server_008_cache_hit_and_expiry(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    fake = Fake()
    patch(monkeypatch, fake)
    now = [100.0]
    collector = Collector(ttl=5.0, clock=lambda: now[0])
    collector.get("p", tmp_path)
    per_collect = len(fake.calls)
    now[0] = 102.0
    collector.get("p", tmp_path)
    assert len(fake.calls) == per_collect
    now[0] = 106.0
    collector.get("p", tmp_path)
    assert len(fake.calls) == 2 * per_collect


# REQ-SERVER-008
def test_server_008_overlapping_requests_run_once(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    fake = Fake()

    def slow(cmd: list[str], **kwargs: Any) -> "subprocess.CompletedProcess[str]":
        time.sleep(0.05)
        return fake(cmd, **kwargs)

    patch(monkeypatch, slow)
    collector = Collector()
    threads = [threading.Thread(target=collector.get, args=("p", tmp_path)) for _ in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert len(fake.calls) == 4  # state, list, ready, blocked: once


# REQ-SERVER-009
def test_server_009_child_env_strips_scripts_on_windows(monkeypatch: pytest.MonkeyPatch) -> None:
    from gin_console.projects.collect import _child_env

    monkeypatch.setattr(os, "pathsep", ";")
    # Test case-insensitivity on Windows (c:\ vs C:\, scripts vs Scripts)
    monkeypatch.setenv("VIRTUAL_ENV", r"c:\project\.venv")
    monkeypatch.setenv(
        "PATH",
        r"C:\project\.venv\scripts;C:\Windows\System32"
    )
    env = _child_env()
    assert r"C:\project\.venv\scripts" not in env["PATH"].split(";")
    assert r"C:\Windows\System32" in env["PATH"].split(";")
    assert "VIRTUAL_ENV" not in env


# REQ-SERVER-009
def test_server_009_gin_without_cmd_shim_runs_via_bash_on_windows(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    import sys

    from gin_console.projects.collect import _resolve_cmd, run_json

    monkeypatch.setattr(sys, "platform", "win32")

    def fake_which(name: str) -> str | None:
        if "bash" in name:
            return r"C:\Git\bin\bash.exe"
        return None

    monkeypatch.setattr("shutil.which", fake_which)

    resolved = _resolve_cmd(["gin", "state", "--format", "json"])
    assert resolved == [r"C:\Git\bin\bash.exe", "-c", 'gin "$@"', "_", "state", "--format", "json"]

    # Verify that run_json invokes the resolved command
    called_cmd: list[list[str]] = []

    def fake_run(cmd: list[str], **kwargs: Any) -> subprocess.CompletedProcess[str]:
        called_cmd.append(cmd)
        return subprocess.CompletedProcess(cmd, 0, stdout="{}", stderr="")

    patch(monkeypatch, fake_run)
    run_json(["gin", "state"], tmp_path)
    assert called_cmd == [[r"C:\Git\bin\bash.exe", "-c", 'gin "$@"', "_", "state"]]


# REQ-SERVER-009
def test_server_009_windows_runs_gin_cmd_shim(monkeypatch: pytest.MonkeyPatch) -> None:
    from gin_console.projects.collect import _resolve_cmd

    monkeypatch.setattr(sys, "platform", "win32")
    shim = r"C:\Users\u\.local\bin\gin.cmd"
    monkeypatch.setattr("shutil.which", lambda name: shim if name == "gin" else None)

    assert _resolve_cmd(["gin", "milestone", "list", "--json"]) == [
        shim, "milestone", "list", "--json"
    ]
    # other commands pass through untouched
    assert _resolve_cmd(["bd", "list"]) == ["bd", "list"]


# REQ-SERVER-006
# REQ-MILESTONE-UI-007
def test_server_006_milestone_not_counted_as_ready(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    milestone = {"id": "m1", "title": "M", "issue_type": "milestone", "status": "open"}
    patch(
        monkeypatch,
        Fake(
            issues=[*ISSUES, milestone],
            ready=[*READY, {"id": "m1", "issue_type": "milestone"}],
        ),
    )
    _, result = Collector().get("p", tmp_path)
    beads = beads_of(result)
    assert beads.ready == 2
    assert [e.id for e in beads.epics] == ["e1", "e2"]
