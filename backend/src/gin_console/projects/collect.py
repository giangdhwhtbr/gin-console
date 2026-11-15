"""Run the read-only gin command for a project, add its Beads counts, and cache the result."""

import json
import os
import shutil
import subprocess
import sys
import threading
import time
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from gin_console.projects.models import (
    Beads,
    BlockError,
    Epic,
    EpicWorkflow,
    ReviewWaiver,
    Team,
    Workflow,
    Workspace,
)

TIMEOUT_SECONDS = 10
TTL_SECONDS = 5.0
EPIC_STATE_WORKERS = 4


class CollectError(Exception):
    """A command failed; the message is shown to the operator in the UI."""

    def __init__(self, message: str, returncode: int | None = None, stderr: str = "") -> None:
        super().__init__(message)
        self.returncode = returncode
        self.stderr = stderr  # the full stderr: the message keeps only its first 200 characters


def _normalize_entry(p: str, is_win: bool) -> str:
    cleaned = p.replace("\\", "/") if is_win else p
    norm = os.path.normpath(cleaned)
    return norm.lower() if is_win else norm


def _child_env() -> dict[str, str]:
    """Environment without the console's own venv: gin's `env python3` shebang must
    resolve to the system Python, which has its dependencies, not ours."""
    env = dict(os.environ)
    venv = env.pop("VIRTUAL_ENV", None)
    if venv and "PATH" in env:
        is_win = sys.platform == "win32" or "\\" in venv or (len(venv) >= 2 and venv[1] == ":")
        targets = {
            _normalize_entry(f"{venv}/{sub}", is_win)
            for sub in ("Scripts", "bin")
        }
        env["PATH"] = os.pathsep.join(
            entry
            for entry in env["PATH"].split(os.pathsep)
            if _normalize_entry(entry, is_win) not in targets
        )
    return env


def _find_bash() -> str | None:
    """Find bash executable on Windows, checking PATH and common Git install locations."""
    bash = shutil.which("bash") or shutil.which("bash.exe")
    if bash:
        return bash
    for env_var in ("ProgramFiles", "ProgramFiles(x86)"):
        base = os.environ.get(env_var)
        if base:
            for sub in (("Git", "bin", "bash.exe"), ("Git", "usr", "bin", "bash.exe")):
                candidate = Path(base).joinpath(*sub)
                if candidate.is_file():
                    return str(candidate)
    return None


def _resolve_cmd(cmd: list[str]) -> list[str]:
    """Adapt commands on Windows where shell scripts cannot be spawned directly."""
    if not cmd:
        return cmd
    if sys.platform == "win32" and cmd[0] == "gin":
        # install.ps1 puts a gin.cmd shim on PATH; CreateProcess finds it only by full name
        shim = shutil.which("gin")
        if shim and Path(shim).suffix.lower() in {".cmd", ".bat", ".exe"}:
            return [shim, *cmd[1:]]
        # install.sh run from Git Bash leaves a script only bash can start
        bash = _find_bash()
        if bash:
            return [bash, "-c", 'gin "$@"', "_", *cmd[1:]]
    return cmd


def _run(cmd: list[str], cwd: Path, timeout: float) -> "subprocess.CompletedProcess[str]":
    try:
        return subprocess.run(
            _resolve_cmd(cmd),
            cwd=cwd,
            env=_child_env(),
            capture_output=True,
            text=True,
            errors="replace",  # a stray byte must not become an uncaught UnicodeDecodeError
            timeout=timeout,
            check=False,
        )
    except FileNotFoundError:
        raise CollectError(f"{cmd[0]} not found") from None
    except subprocess.TimeoutExpired:
        raise CollectError(f"{cmd[0]} timed out") from None
    except OSError as exc:  # e.g. PermissionError on the command or the project directory
        raise CollectError(f"{cmd[0]} failed: {exc.strerror}") from None


def _exit_error(cmd: list[str], done: "subprocess.CompletedProcess[str]") -> CollectError:
    return CollectError(
        f"{cmd[0]} exited {done.returncode}: {done.stderr.strip()[:200]}",
        done.returncode,
        done.stderr,
    )


def run_text(cmd: list[str], cwd: Path, timeout: float = TIMEOUT_SECONDS) -> str:
    done = _run(cmd, cwd, timeout)
    if done.returncode != 0:
        raise _exit_error(cmd, done)
    return done.stdout


def run_json(
    cmd: list[str],
    cwd: Path,
    json_on_failure: bool = False,
    timeout: float = TIMEOUT_SECONDS,
) -> Any:
    done = _run(cmd, cwd, timeout)
    if done.returncode != 0 and not json_on_failure:
        raise _exit_error(cmd, done)
    try:
        return json.loads(done.stdout)
    except ValueError:
        detail = (
            f" (exit {done.returncode}: {done.stderr.strip()[:200]})" if done.returncode else ""
        )
        raise CollectError(f"{cmd[0]} printed invalid JSON{detail}") from None


def _optional(model: type[Any], value: Any) -> Any:
    """An optional block of gin's output: anything malformed becomes None."""
    try:
        return model.model_validate(value)
    except ValidationError:
        return None


def _strings(value: Any) -> list[str]:
    return [v for v in value if isinstance(v, str)] if isinstance(value, list) else []


def _waivers(value: Any) -> list[ReviewWaiver]:
    items = (_optional(ReviewWaiver, v) for v in value) if isinstance(value, list) else ()
    return [w for w in items if w is not None]


def collect_workflow(path: Path) -> Workflow | BlockError:
    try:
        # state exits 1 for a finished workflow (decision "complete") but still prints JSON
        data = run_json(["gin", "state", "--format", "json"], path, json_on_failure=True)
        project = data["project"]
        decision = data.get("decision")
        return Workflow(
            stage=data["stage"],
            layout=project["layout"],
            gates=data["gates"],
            workspace=_optional(Workspace, data.get("workspace")),
            team=_optional(Team, project.get("team")),
            decision=decision if isinstance(decision, str) else None,
            warnings=_strings(data.get("warnings")),
            remedies=_strings(data.get("remedies")),
            review_waivers=_waivers(data.get("review_waivers")),
        )
    except CollectError as exc:
        return BlockError(error=str(exc))
    except (KeyError, TypeError, ValidationError) as exc:
        return BlockError(error=f"gin: unexpected output ({exc!r})")


def collect_epic_workflow(path: Path, epic_id: str) -> EpicWorkflow | BlockError:
    try:
        data = run_json(
            ["gin", "state", "--workflow-id", epic_id, "--format", "json"],
            path,
            json_on_failure=True,
        )
        return EpicWorkflow(
            stage=data["stage"],
            gates=data["gates"],
            warnings=_strings(data.get("warnings")),
            review_waivers=_waivers(data.get("review_waivers")),
        )
    except CollectError as exc:
        return BlockError(error=str(exc))
    except (KeyError, TypeError, ValidationError) as exc:
        return BlockError(error=f"gin: unexpected output ({exc!r})")


def _with_epic_workflows(beads: Beads | BlockError, path: Path) -> Beads | BlockError:
    """Attach the stage of each in_progress epic; ready epics cost no process."""
    if isinstance(beads, BlockError):
        return beads
    running = [e for e in beads.epics if e.status == "in_progress"]
    if not running:
        return beads
    with ThreadPoolExecutor(max_workers=EPIC_STATE_WORKERS) as pool:
        states = list(pool.map(lambda e: collect_epic_workflow(path, e.id), running))
    by_id = {e.id: s for e, s in zip(running, states, strict=True)}
    epics = [
        Epic(**e.model_dump(exclude={"workflow"}), workflow=by_id.get(e.id)) for e in beads.epics
    ]
    return beads.model_copy(update={"epics": epics})


Result = tuple[Workflow | BlockError, Beads | BlockError]
BeadsReader = Callable[[Path], Beads | BlockError]


class Collector:
    """Per-project cache; one lock per project so overlapping requests run the commands once."""

    def __init__(
        self,
        beads: BeadsReader,
        ttl: float = TTL_SECONDS,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._beads = beads
        self._ttl = ttl
        self._clock = clock
        self._cache: dict[str, tuple[float, Result]] = {}
        self._locks: dict[str, threading.Lock] = {}

    def clear(self) -> None:
        self._cache = {}

    def get(self, name: str, path: Path) -> Result:
        with self._locks.setdefault(name, threading.Lock()):
            hit = self._cache.get(name)
            if hit is not None and self._clock() - hit[0] < self._ttl:
                return hit[1]
            result = (collect_workflow(path), _with_epic_workflows(self._beads(path), path))
            self._cache[name] = (self._clock(), result)
            return result
