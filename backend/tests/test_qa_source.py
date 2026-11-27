"""The gin-qa source: `gin-qa cases export` read into the console's models (REQ-QA-001, 002)."""

import json
import subprocess
from pathlib import Path
from typing import Any

import pytest
from fake_gin_qa import EXPORT, FakeGinQa, case, export

from gin_console.qa.source import QA_TIMEOUT, QaError, load_cases, run_gin_qa


class Cli:
    """Stands in for `subprocess.run`: prints `output`, or raises `failure`."""

    def __init__(self, output: str = "{}", code: int = 0, failure: Exception | None = None) -> None:
        self.output, self.code, self.failure = output, code, failure
        self.calls: list[tuple[list[str], dict[str, Any]]] = []

    def __call__(self, cmd: list[str], **kwargs: Any) -> "subprocess.CompletedProcess[str]":
        self.calls.append((cmd, kwargs))
        if self.failure is not None:
            raise self.failure
        return subprocess.CompletedProcess(cmd, self.code, self.output, "boom")


def patch(monkeypatch: pytest.MonkeyPatch, cli: Cli) -> Cli:
    monkeypatch.setattr(subprocess, "run", cli)
    return cli


def raises(run: Any, tmp_path: Path) -> QaError:
    with pytest.raises(QaError) as err:
        load_cases(run, tmp_path)
    return err.value


# REQ-QA-001: the export is run in the project's directory and its fields are kept
def test_qa_001_fields_kept(tmp_path: Path) -> None:
    row = case(
        "TC-UI-115",
        effective_result="failed",
        result="failed",
        run="qa/evidence/r1",
        bug="gin-console-3kd",
        steps=["Open the page", {"text": "Click"}],
        expected=["It shows"],
        preconditions=["Signed in"],
    )
    fake = FakeGinQa({EXPORT: export(row)})
    found = load_cases(fake, tmp_path).cases[0]
    assert fake.calls == [(list(EXPORT), tmp_path)]
    assert (found.id, found.title, found.capability, found.type, found.priority) == (
        "TC-UI-115",
        "Title of TC-UI-115",
        "ui",
        "e2e",
        "medium",
    )
    assert (found.result, found.effective_result, found.run, found.bug) == (
        "failed",
        "failed",
        "qa/evidence/r1",
        "gin-console-3kd",
    )
    assert found.file == "qa/cases/ui/TC-UI-115.e2e.md"
    assert [r.id for r in found.reqs] == ["REQ-UI-001"]
    assert found.steps == ["Open the page", {"text": "Click"}]
    assert found.expected == ["It shows"] and found.preconditions == ["Signed in"]


# REQ-QA-001: Unknown result and new keys
def test_qa_001_unknown_keys_ignored(tmp_path: Path) -> None:
    row = case("TC-UI-003", effective_result="skipped", flaky=True)
    data = export(row) | {"generated": "2026-11-27"}
    found = load_cases(FakeGinQa({EXPORT: data}), tmp_path).cases[0]
    assert found.effective_result == "skipped"
    assert "flaky" not in found.model_dump()


# REQ-QA-001: keys an older export leaves out take their empty value
def test_qa_001_optional_keys(tmp_path: Path) -> None:
    row = {k: v for k, v in case().items() if k not in {"priority", "run", "bug", "reqs", "steps"}}
    found = load_cases(FakeGinQa({EXPORT: export(row)}), tmp_path).cases[0]
    assert (found.priority, found.run, found.bug, found.reqs, found.steps) == ("", "", "", [], [])


# REQ-QA-002: No gin-qa
def test_qa_002_no_gin_qa(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    patch(monkeypatch, Cli(failure=FileNotFoundError("gin-qa")))
    error = raises(run_gin_qa, tmp_path)
    assert error.cause == "missing"
    assert str(error) == "gin-qa is not installed on the console host"


# REQ-QA-002: Old gin-qa
@pytest.mark.parametrize(
    "data",
    [
        export({k: v for k, v in case().items() if k != "effective_result"}),
        export(case(effective_result=None)),
        {"tests": []},
        {"cases": "none"},
        [case()],
    ],
    ids=["no-effective-result", "null-effective-result", "no-cases", "cases-not-a-list", "list"],
)
def test_qa_002_old_gin_qa(tmp_path: Path, data: Any) -> None:
    error = raises(FakeGinQa({EXPORT: data}), tmp_path)
    assert error.cause == "outdated"
    assert str(error) == "this gin-qa has no effective_result"


# REQ-QA-002: Timeout
def test_qa_002_timeout(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    cli = patch(monkeypatch, Cli(failure=subprocess.TimeoutExpired("gin-qa", QA_TIMEOUT)))
    error = raises(run_gin_qa, tmp_path)
    assert error.cause is None and "timed out" in str(error)
    assert QA_TIMEOUT == 30.0 and cli.calls[0][1]["timeout"] == QA_TIMEOUT


# REQ-QA-002: output that is not JSON
def test_qa_002_invalid_json(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    patch(monkeypatch, Cli(output="not json"))
    error = raises(run_gin_qa, tmp_path)
    assert error.cause is None and "invalid JSON" in str(error)


# REQ-QA-002: gin-qa exits with an error
def test_qa_002_exit_error(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    patch(monkeypatch, Cli(code=2))
    error = raises(run_gin_qa, tmp_path)
    assert error.cause is None and str(error) == "gin-qa exited 2: boom"


# REQ-QA-002: the real runner calls gin-qa with the export arguments in the project
def test_qa_002_runner_arguments(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    cli = patch(monkeypatch, Cli(output=json.dumps(export(case()))))
    assert [c.id for c in load_cases(run_gin_qa, tmp_path).cases] == ["TC-UI-001"]
    cmd, kwargs = cli.calls[0]
    assert cmd == ["gin-qa", *EXPORT] and kwargs["cwd"] == tmp_path


# REQ-QA-002: a case the console cannot read is not understood, without a cause
@pytest.mark.parametrize(
    "data",
    [
        export(case(title=None)),
        export(case(steps="one")),
        export(case(reqs=[{"hash8": "1a2b3c4d"}])),
        {"cases": ["TC-UI-001"]},
    ],
    ids=["title", "steps", "req-id", "case-not-an-object"],
)
def test_qa_002_not_understood(tmp_path: Path, data: Any) -> None:
    error = raises(FakeGinQa({EXPORT: data}), tmp_path)
    assert error.cause is None
    assert str(error) == "gin-qa cases export output was not understood"
