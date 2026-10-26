"""Run the read-only gin-workflow and bd commands for a project and cache the result."""

import json
import os
import shutil
import subprocess
import sys
import threading
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from gin_console.projects.models import Beads, BlockError, Epic, Workflow

TIMEOUT_SECONDS = 10
TTL_SECONDS = 5.0


class CollectError(Exception):
    """A command failed; the message is shown to the operator in the UI."""


def _normalize_entry(p: str, is_win: bool) -> str:
    cleaned = p.replace("\\", "/") if is_win else p
    norm = os.path.normpath(cleaned)
    return norm.lower() if is_win else norm


def _child_env() -> dict[str, str]:
    """Environment without the console's own venv: gin-workflow's `env python3` shebang must
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
    if sys.platform == "win32" and cmd[0] == "gin-workflow":
        bash = _find_bash()
        if bash:
            return [bash, "-c", 'gin-workflow "$@"', "_", *cmd[1:]]
    return cmd


def run_json(
    cmd: list[str],
    cwd: Path,
    json_on_failure: bool = False,
    timeout: float = TIMEOUT_SECONDS,
) -> Any:
    exec_cmd = _resolve_cmd(cmd)
    try:
        done = subprocess.run(
            exec_cmd,
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
    if done.returncode != 0 and not json_on_failure:
        raise CollectError(f"{cmd[0]} exited {done.returncode}: {done.stderr.strip()[:200]}")
    try:
        return json.loads(done.stdout)
    except ValueError:
        detail = (
            f" (exit {done.returncode}: {done.stderr.strip()[:200]})" if done.returncode else ""
        )
        raise CollectError(f"{cmd[0]} printed invalid JSON{detail}") from None


def collect_workflow(path: Path) -> Workflow | BlockError:
    try:
        # state exits 1 for a finished workflow (decision "complete") but still prints JSON
        data = run_json(["gin-workflow", "state", "--format", "json"], path, json_on_failure=True)
        return Workflow(stage=data["stage"], layout=data["project"]["layout"], gates=data["gates"])
    except CollectError as exc:
        return BlockError(error=str(exc))
    except (KeyError, TypeError, ValidationError) as exc:
        return BlockError(error=f"gin-workflow: unexpected output ({exc!r})")


def collect_beads(path: Path) -> Beads | BlockError:
    try:
        issues = run_json(
            ["bd", "list", "--status", "open,in_progress", "--limit", "0", "--json"], path
        )
        ready = run_json(["bd", "ready", "--limit", "0", "--json"], path)
        blocked = run_json(["bd", "blocked", "--json"], path)
        ready_ids = {issue["id"] for issue in ready}
        return Beads(
            open=sum(issue["status"] == "open" for issue in issues),
            in_progress=sum(issue["status"] == "in_progress" for issue in issues),
            blocked=len(blocked),
            ready=len(ready),
            epics=[
                Epic(id=issue["id"], title=issue["title"])
                for issue in issues
                if issue["issue_type"] == "epic"
                and (issue["status"] == "in_progress" or issue["id"] in ready_ids)
            ],
        )
    except CollectError as exc:
        return BlockError(error=str(exc))
    except (KeyError, TypeError, ValidationError) as exc:
        return BlockError(error=f"bd: unexpected output ({exc!r})")


Result = tuple[Workflow | BlockError, Beads | BlockError]


class Collector:
    """Per-project cache; one lock per project so overlapping requests run the commands once."""

    def __init__(
        self, ttl: float = TTL_SECONDS, clock: Callable[[], float] = time.monotonic
    ) -> None:
        self._ttl = ttl
        self._clock = clock
        self._cache: dict[str, tuple[float, Result]] = {}
        self._locks: dict[str, threading.Lock] = {}

    def get(self, name: str, path: Path) -> Result:
        with self._locks.setdefault(name, threading.Lock()):
            hit = self._cache.get(name)
            if hit is not None and self._clock() - hit[0] < self._ttl:
                return hit[1]
            result = (collect_workflow(path), collect_beads(path))
            self._cache[name] = (self._clock(), result)
            return result
