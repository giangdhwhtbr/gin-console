"""Test cases of a project via `gin-qa cases export`; the only module that knows its JSON."""

from pathlib import Path
from typing import Any, Protocol

from pydantic import ValidationError

from gin_console.projects.collect import CollectError, run_json
from gin_console.qa.models import CaseExport, Cause

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
