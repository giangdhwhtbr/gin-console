import os
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Any

import pytest
from fake_export import write_export
from fakes import ISSUES, Fake

from gin_console.beads.snapshot import SnapshotStore
from gin_console.beads.source import read_export
from gin_console.projects.collect import Collector
from gin_console.projects.models import Beads, BlockError, Workflow
from gin_console.projects.source import count_beads


def collector(ttl: float = 5.0, clock: Any = time.monotonic) -> Collector:
    """A Collector reading Beads counts from the project's `.beads/issues.jsonl`."""
    store = SnapshotStore(read_export)
    return Collector(lambda path: count_beads(store, path), ttl=ttl, clock=clock)


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
    workflow, _ = collector().get("p", tmp_path)
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
    collector().get("p", tmp_path)
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
    workflow, _ = collector().get("p", tmp_path)
    assert workflow_of(workflow).stage == "plan"


# REQ-SERVER-006
def test_server_006_beads_counts_and_epics(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    fake = Fake()
    patch(monkeypatch, fake)
    write_export(tmp_path, ISSUES)
    _, result = collector().get("p", tmp_path)
    beads = beads_of(result)
    assert (beads.open, beads.in_progress, beads.blocked, beads.ready) == (3, 1, 1, 2)
    assert [e.id for e in beads.epics] == ["e1", "e2"]
    assert beads.stale is False
    assert [c[0] for c in fake.calls] == ["gin"]  # REQ-BEADS-003: no bd


# REQ-SERVER-006
def test_server_006_no_active_epics(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    patch(monkeypatch, Fake())
    write_export(tmp_path, [{"id": "t1", "title": "T", "issue_type": "task", "status": "open"}])
    _, result = collector().get("p", tmp_path)
    assert beads_of(result).epics == []


# REQ-SERVER-007
# REQ-BEADS-005
@pytest.mark.parametrize(
    ("content", "error"),
    [
        (None, "could not be read"),
        ('{"id": "t1"}\nnot json\n', "not JSON"),
        ('{"id": "t1"}\n[1, 2]\n', "not a JSON object"),
    ],
)
def test_server_007_beads_error_isolated(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, content: str | None, error: str
) -> None:
    patch(monkeypatch, Fake())
    path = tmp_path / ".beads" / "issues.jsonl"
    if content is None:
        path.mkdir(parents=True)  # a directory: the file cannot be read
    else:
        path.parent.mkdir()
        path.write_text(content)
    workflow, beads = collector().get("p", tmp_path)
    assert isinstance(beads, BlockError) and error in beads.error
    assert workflow_of(workflow).stage == "plan"


# REQ-BEADS-005 (Projects block)
def test_beads_005_projects_block_error(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    patch(monkeypatch, Fake())
    workflow, beads = collector().get("p", tmp_path)
    assert isinstance(beads, BlockError)
    assert ".beads/issues.jsonl" in beads.error
    assert "bd config set export.auto true" in beads.error
    assert workflow_of(workflow).stage == "plan"


def manifest(project: Path, content: bytes) -> None:
    path = project / ".beads" / "embeddeddolt" / "db" / ".dolt" / "noms" / "manifest"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)


# REQ-BEADS-013 (Fresh export, Write not exported, Export catches up)
def test_beads_013_projects_stale(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    patch(monkeypatch, Fake())
    now = [100.0]
    collector_ = collector(clock=lambda: now[0])
    manifest(tmp_path, b"root-1")
    exported = write_export(tmp_path, ISSUES)
    os.utime(exported, ns=(1_000_000_000, 1_000_000_000))
    assert beads_of(collector_.get("p", tmp_path)[1]).stale is False
    manifest(tmp_path, b"root-2")  # a bd write that was not exported
    now[0] += 6  # past the 5-second reuse (REQ-SERVER-008)
    beads = beads_of(collector_.get("p", tmp_path)[1])
    assert beads.stale is True and beads.open == 3  # counts are those of the file
    write_export(tmp_path, [*ISSUES, {"id": "t2", "title": "T", "status": "open"}])
    os.utime(exported, ns=(2_000_000_000, 2_000_000_000))
    now[0] += 6
    beads = beads_of(collector_.get("p", tmp_path)[1])
    assert beads.stale is False and beads.open == 4


# REQ-BEADS-013 (No manifest)
def test_beads_013_no_manifest_not_stale(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    patch(monkeypatch, Fake())
    write_export(tmp_path, ISSUES)
    assert beads_of(collector().get("p", tmp_path)[1]).stale is False


# REQ-SERVER-007
def test_server_007_workflow_error_isolated(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    patch(monkeypatch, Fake({"gin": 2}))
    write_export(tmp_path, ISSUES)
    workflow, beads = collector().get("p", tmp_path)
    assert isinstance(workflow, BlockError) and "gin" in workflow.error
    assert beads_of(beads).ready == 2


# REQ-SERVER-007
def test_server_007_invalid_json(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    patch(
        monkeypatch,
        lambda cmd, **kw: subprocess.CompletedProcess(cmd, 0, "not json", ""),
    )
    (tmp_path / ".beads").mkdir()
    (tmp_path / ".beads" / "issues.jsonl").write_text("not json\n")
    workflow, beads = collector().get("p", tmp_path)
    assert isinstance(workflow, BlockError) and isinstance(beads, BlockError)


# REQ-SERVER-007
def test_server_007_unexpected_shape(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    patch(monkeypatch, lambda cmd, **kw: subprocess.CompletedProcess(cmd, 0, "[{}]", ""))
    (tmp_path / ".beads").mkdir()
    (tmp_path / ".beads" / "issues.jsonl").write_text("[{}]\n")
    workflow, beads = collector().get("p", tmp_path)
    assert isinstance(workflow, BlockError) and isinstance(beads, BlockError)


# REQ-SERVER-008
def test_server_008_cache_hit_and_expiry(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    fake = Fake()
    patch(monkeypatch, fake)
    now = [100.0]
    collector_ = collector(ttl=5.0, clock=lambda: now[0])
    collector_.get("p", tmp_path)
    per_collect = len(fake.calls)
    now[0] = 102.0
    collector_.get("p", tmp_path)
    assert len(fake.calls) == per_collect
    now[0] = 106.0
    collector_.get("p", tmp_path)
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
    collector_ = collector()
    threads = [threading.Thread(target=collector_.get, args=("p", tmp_path)) for _ in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert len(fake.calls) == 1  # state: once


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
    patch(monkeypatch, Fake())
    write_export(tmp_path, [*ISSUES, milestone])
    _, result = collector().get("p", tmp_path)
    beads = beads_of(result)
    assert beads.ready == 2
    assert [e.id for e in beads.epics] == ["e1", "e2"]
