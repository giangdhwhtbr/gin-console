import os
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest
from fake_export import bead, dep, write_export
from fakes import ISSUES, Fake

from gin_console.beads.snapshot import SnapshotStore
from gin_console.beads.source import read_export
from gin_console.projects.models import Beads, BlockError
from gin_console.projects.source import count_beads


def counted(path: Path) -> Beads | BlockError:
    """The Beads counts of a project, read from its `.beads/issues.jsonl`."""
    return count_beads(SnapshotStore(read_export), path)


def patch(monkeypatch: pytest.MonkeyPatch, fake: Any) -> None:
    monkeypatch.setattr(subprocess, "run", fake)


def beads_of(result: Beads | BlockError) -> Beads:
    assert isinstance(result, Beads)
    return result


# REQ-SERVER-006
def test_server_006_beads_counts_and_epics(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    fake = Fake()
    patch(monkeypatch, fake)
    write_export(tmp_path, ISSUES)
    result = counted(tmp_path)
    beads = beads_of(result)
    assert (beads.open, beads.in_progress, beads.blocked, beads.ready) == (3, 1, 1, 2)
    assert [e.id for e in beads.epics] == ["e1", "e2"]
    assert beads.stale is False
    assert fake.calls == []  # REQ-BEADS-003: no process


# REQ-SERVER-006
def test_server_006_merge_gates_not_counted(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    patch(monkeypatch, Fake())
    write_export(
        tmp_path,
        [
            bead("e1", issue_type="epic", status="in_progress"),
            bead("t1", dependencies=[dep("t1", "g1", "blocks")]),
            bead("g1", title="external: .planning/plans/x.md#2", labels=["prep"]),
            bead("g2", title="external: .planning/plans/x.md#3", status="in_progress"),
            bead(
                "g3",
                title="external: .planning/plans/x.md#4",
                issue_type="epic",
                dependencies=[dep("g3", "g2", "blocks")],
            ),
        ],
    )
    result = counted(tmp_path)
    beads = beads_of(result)
    counts = (beads.open, beads.in_progress, beads.blocked, beads.ready, beads.prep)
    assert counts == (1, 1, 1, 0, 0)
    assert [e.id for e in beads.epics] == ["e1"]


# REQ-SERVER-006
def test_server_006_no_active_epics(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    patch(monkeypatch, Fake())
    write_export(tmp_path, [{"id": "t1", "title": "T", "issue_type": "task", "status": "open"}])
    result = counted(tmp_path)
    assert beads_of(result).epics == []


# REQ-BEADS-005 (Projects block)
@pytest.mark.parametrize(
    ("content", "error"),
    [
        (None, "could not be read"),
        ('{"id": "t1"}\nnot json\n', "not JSON"),
        ('{"id": "t1"}\n[1, 2]\n', "not a JSON object"),
    ],
)
def test_beads_005_projects_block_error(
    tmp_path: Path, content: str | None, error: str
) -> None:
    path = tmp_path / ".beads" / "issues.jsonl"
    if content is None:
        path.mkdir(parents=True)  # a directory: the file cannot be read
    else:
        path.parent.mkdir()
        path.write_text(content)
    result = counted(tmp_path)
    assert isinstance(result, BlockError) and error in result.error


# REQ-BEADS-005 (Projects block): a missing export names the file and the fix
def test_beads_005_missing_export_block_error(tmp_path: Path) -> None:
    result = counted(tmp_path)
    assert isinstance(result, BlockError)
    assert ".beads/issues.jsonl" in result.error
    assert "bd config set export.auto true" in result.error


def manifest(project: Path, content: bytes) -> None:
    path = project / ".beads" / "embeddeddolt" / "db" / ".dolt" / "noms" / "manifest"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)


# REQ-BEADS-013 (Fresh export, Write not exported, Export catches up)
def test_beads_013_stale(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    patch(monkeypatch, Fake())
    store = SnapshotStore(read_export)
    manifest(tmp_path, b"root-1")
    exported = write_export(tmp_path, ISSUES)
    os.utime(exported, ns=(1_000_000_000, 1_000_000_000))
    assert beads_of(count_beads(store, tmp_path)).stale is False
    manifest(tmp_path, b"root-2")  # a bd write that was not exported
    beads = beads_of(count_beads(store, tmp_path))
    assert beads.stale is True and beads.open == 3  # counts are those of the file
    write_export(tmp_path, [*ISSUES, {"id": "t2", "title": "T", "status": "open"}])
    os.utime(exported, ns=(2_000_000_000, 2_000_000_000))
    beads = beads_of(count_beads(store, tmp_path))
    assert beads.stale is False and beads.open == 4


# REQ-BEADS-013 (No manifest)
def test_beads_013_no_manifest_not_stale(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    patch(monkeypatch, Fake())
    write_export(tmp_path, ISSUES)
    assert beads_of(counted(tmp_path)).stale is False


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
    result = counted(tmp_path)
    beads = beads_of(result)
    assert beads.ready == 2
    assert [e.id for e in beads.epics] == ["e1", "e2"]


# REQ-SERVER-006 (Counts and active epics: epics carry status)
def test_server_006_epics_carry_status(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    patch(monkeypatch, Fake())
    write_export(tmp_path, ISSUES)
    result = counted(tmp_path)
    assert {e.id: e.status for e in beads_of(result).epics} == {
        "e1": "in_progress",
        "e2": "open",
    }
