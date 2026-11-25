"""Requirements of a project via `gin specs`; the only module that knows its JSON."""

from pathlib import Path
from typing import Any, Protocol

from pydantic import ValidationError

from gin_console.projects.collect import CollectError, run_json
from gin_console.requirements.models import Cause, Reqs, Trace

GIN_TIMEOUT = 30.0
SCHEMA = 1
_OLD = (
    "arguments are required: --change",
    "unrecognized arguments: --all",
    "invalid choice: 'trace'",
)


class RequirementsError(Exception):
    """gin could not answer; `cause` names a reason the page explains with its fix."""

    def __init__(self, message: str, cause: Cause | None = None) -> None:
        super().__init__(message)
        self.cause: Cause | None = cause


class GinRunner(Protocol):
    def __call__(self, args: list[str], cwd: Path) -> Any: ...


def run_gin(args: list[str], cwd: Path) -> Any:
    try:
        return run_json(["gin", *args], cwd, timeout=GIN_TIMEOUT)
    except CollectError as exc:
        if exc.returncode == 2 and any(text in exc.stderr for text in _OLD):
            raise RequirementsError("this gin has no specs trace --all", "outdated") from None
        raise RequirementsError(str(exc)) from None


def load_trace(run: GinRunner, cwd: Path) -> Trace:
    data = run(["specs", "trace", "--all", "--format", "json"], cwd)
    if not isinstance(data, dict):
        raise RequirementsError("gin specs trace output was not understood")
    if data.get("schema") != SCHEMA:
        raise RequirementsError(f"gin reports trace schema {data.get('schema')}", "schema")
    try:
        return Trace.model_validate(data)
    except ValidationError:
        raise RequirementsError("gin specs trace output was not understood") from None


def load_reqs(run: GinRunner, cwd: Path) -> Reqs:
    try:
        return Reqs.model_validate(run(["specs", "reqs", "--format", "json"], cwd))
    except ValidationError:
        raise RequirementsError("gin specs reqs output was not understood") from None
