import json
import subprocess
from pathlib import Path
from typing import Any

import pytest
from fake_gin import trace

from gin_console.requirements.source import RequirementsError, load_reqs, load_trace, run_gin


class Cli:
    def __init__(self, code: int = 0, output: Any = None, stderr: str = "") -> None:
        self.code, self.output, self.stderr = code, output, stderr
        self.calls: list[list[str]] = []

    def __call__(self, cmd: list[str], **kwargs: Any) -> "subprocess.CompletedProcess[str]":
        self.calls.append(cmd)
        return subprocess.CompletedProcess(cmd, self.code, json.dumps(self.output), self.stderr)


def patch(monkeypatch: pytest.MonkeyPatch, cli: Any) -> None:
    monkeypatch.setattr(subprocess, "run", cli)


# REQ-REQUIREMENTS-001, REQ-REQUIREMENTS-005
def test_requirements_005_arguments(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    cli = Cli(output=trace())
    patch(monkeypatch, cli)
    assert load_trace(run_gin, tmp_path).layout == "sdd"
    assert cli.calls[0][-5:] == ["specs", "trace", "--all", "--format", "json"]
    cli.output = {"requirements": []}
    assert load_reqs(run_gin, tmp_path).requirements == []
    assert cli.calls[1][-4:] == ["specs", "reqs", "--format", "json"]


# REQ-REQUIREMENTS-005: old gin
@pytest.mark.parametrize(
    "stderr",
    [
        "the following arguments are required: --change",
        "unrecognized arguments: --all",
        "invalid choice: 'trace'",
    ],
)
def test_requirements_005_old_gin(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, stderr: str
) -> None:
    patch(monkeypatch, Cli(code=2, stderr=stderr))
    with pytest.raises(RequirementsError) as err:
        load_trace(run_gin, tmp_path)
    assert err.value.cause == "outdated"


# REQ-REQUIREMENTS-005
def test_requirements_005_exit_one(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    patch(monkeypatch, Cli(code=1, stderr="boom"))
    with pytest.raises(RequirementsError) as err:
        load_trace(run_gin, tmp_path)
    assert err.value.cause is None


# REQ-REQUIREMENTS-005: timeout
def test_requirements_005_timeout(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    def slow(cmd: list[str], **kwargs: Any) -> None:
        raise subprocess.TimeoutExpired(cmd, 30)

    patch(monkeypatch, slow)
    with pytest.raises(RequirementsError, match="timed out"):
        load_trace(run_gin, tmp_path)


# REQ-REQUIREMENTS-005: schema
def test_requirements_005_schema(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    patch(monkeypatch, Cli(output=trace(schema=2)))
    with pytest.raises(RequirementsError) as err:
        load_trace(run_gin, tmp_path)
    assert err.value.cause == "schema"


# REQ-REQUIREMENTS-005: not understood
def test_requirements_005_not_object(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    patch(monkeypatch, Cli(output=[1]))
    with pytest.raises(RequirementsError) as err:
        load_trace(run_gin, tmp_path)
    assert err.value.cause is None
