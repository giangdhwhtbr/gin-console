import subprocess
import threading
import time
from pathlib import Path
from typing import Any

import pytest
from fakes import Fake

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
    # `gin-workflow state` exits 1 for a finished workflow but still prints JSON.
    inner = Fake()

    def run(cmd: list[str], **kwargs: Any) -> "subprocess.CompletedProcess[str]":
        done = inner(cmd, **kwargs)
        if cmd[0] == "gin-workflow":
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
    patch(monkeypatch, Fake({"gin-workflow": 2}))
    workflow, beads = Collector().get("p", tmp_path)
    assert isinstance(workflow, BlockError) and "gin-workflow" in workflow.error
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
