"""Test cases of a project via `gin-qa cases export`; the only module that knows its JSON."""

from datetime import date
from pathlib import Path
from typing import Any, Protocol

from pydantic import ValidationError

from gin_console.projects.collect import CollectError, run_json
from gin_console.qa.models import CaseExport, Cause, ExportRun, RunExport

QA_TIMEOUT = 30.0


class QaError(Exception):
    """gin-qa could not answer; `cause` names a reason the page explains with its fix."""

    def __init__(self, message: str, cause: Cause | None = None) -> None:
        super().__init__(message)
        self.cause: Cause | None = cause


class GinQaRunner(Protocol):
    def __call__(self, args: list[str], cwd: Path) -> Any: ...


def run_gin_qa(args: list[str], cwd: Path) -> Any:
    try:
        return run_json(["gin-qa", *args], cwd, timeout=QA_TIMEOUT)
    except CollectError as exc:
        if exc.returncode is None and str(exc).endswith("not found"):
            raise QaError("gin-qa is not installed on the console host", "missing") from None
        if exc.returncode == 2 and "invalid choice" in exc.stderr:
            raise QaError(f"this gin-qa has no `{args[0]}` command", "outdated") from None
        raise QaError(str(exc)) from None


def _outdated(data: Any) -> bool:
    """No `cases` list, or a case without the `effective_result` an older gin-qa lacks."""
    cases = data.get("cases") if isinstance(data, dict) else None
    if not isinstance(cases, list):
        return True
    return any(
        isinstance(row, dict) and not isinstance(row.get("effective_result"), str) for row in cases
    )


def load_cases(run: GinQaRunner, cwd: Path) -> CaseExport:
    data = run(["cases", "export", "--format", "json"], cwd)
    if _outdated(data):
        raise QaError("this gin-qa has no effective_result", "outdated")
    try:
        return CaseExport.model_validate(data)
    except ValidationError:
        raise QaError("gin-qa cases export output was not understood") from None


def load_runs(run: GinQaRunner, cwd: Path, since: date) -> RunExport:
    """The runs since a UTC date (REQ-QA-014); a row that cannot be read is left out and named in
    `problems`, after the export's own."""
    data = run(["runs", "export", "--format", "json", "--since", since.isoformat()], cwd)
    rows = data.get("runs") if isinstance(data, dict) else None
    if not isinstance(rows, list):
        raise QaError("this gin-qa has no run history", "outdated")
    own = data.get("problems")
    problems = list(own) if isinstance(own, list) and all(isinstance(p, str) for p in own) else []
    runs: list[ExportRun] = []
    for n, row in enumerate(rows, start=1):
        try:
            runs.append(ExportRun.model_validate(row))
        except ValidationError as exc:
            first = exc.errors()[0]
            where = ".".join(str(part) for part in first["loc"])
            problems.append(f"run {n}: {where + ': ' if where else ''}{first['msg']}")
    return RunExport(runs=runs, problems=problems)
