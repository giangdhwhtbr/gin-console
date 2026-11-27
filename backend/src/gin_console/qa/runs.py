"""The latest e2e run of a case (REQ-QA-005) and its step screenshots (REQ-QA-006): the only
module that reads run files.

The browser never sends a path: it asks for step `n` of a case, and the file is found again here
from the case's `run` and the `result.json` of that run.
"""

import json
import os
import re
import stat
from pathlib import Path
from typing import Any, Literal

from gin_console.beads.images import check, read_image
from gin_console.config import ProjectEntry
from gin_console.qa.models import ExportCase, LatestRun, RunReason, RunStep

RESULT_LIMIT = 1024 * 1024  # bytes of result.json read
_SCREENSHOT = re.compile(r"[A-Za-z0-9._-]+")  # a plain file name, no folder
# what pathlib and os raise for a path the system refuses (see beads/images.py)
_REFUSED = (OSError, ValueError, RuntimeError)
_MISSING = (FileNotFoundError, NotADirectoryError)
# one open of the resolved file: never wait on a FIFO, never follow a link put in its place
_OPEN_FLAGS = (
    os.O_RDONLY
    | getattr(os, "O_NONBLOCK", 0)
    | getattr(os, "O_NOFOLLOW", 0)
    | getattr(os, "O_BINARY", 0)
)


def run_folder(entry: ProjectEntry, run: str) -> Path | None | Literal["invalid"]:
    """The folder `run` names, links resolved, when it lies inside the project; None for no run.
    The text is refused before it touches the disk, as `beads/images.locate` does."""
    if not run:
        return None
    parts = run.split("/")
    # an empty part is a leading `/` (absolute), `//` or a trailing `/`; `:` is a drive or stream
    if "\\" in run or "\0" in run or ":" in run or ".." in parts or "" in parts:
        return "invalid"
    try:
        project = entry.path.resolve()
        folder = (project / run).resolve()
    except _REFUSED:
        return "invalid"
    return folder if folder.is_relative_to(project) else "invalid"


def _read_result(file: Path, project: Path) -> bytes | RunReason:
    """At most `RESULT_LIMIT` + 1 bytes of `file`, a regular file inside `project`, links
    resolved; opened once."""
    try:
        root = project.resolve(strict=True)
        found = file.resolve(strict=True)
        if not found.is_relative_to(root):
            return "invalid"
        handle = os.open(found, _OPEN_FLAGS)
    except _MISSING:
        return "not_on_host"
    except _REFUSED:
        return "invalid"
    try:
        opened = os.fstat(handle)
        # a folder on the way may have been swapped for a link after `file` was resolved
        # simplified: a swap undone between this check and the read is not seen; beads/images.py
        # asks /proc/self/fd where it exists, for images
        again = file.resolve(strict=True)
        current = os.stat(again)
        same = (current.st_dev, current.st_ino) == (opened.st_dev, opened.st_ino)
        if not (stat.S_ISREG(opened.st_mode) and same and again.is_relative_to(root)):
            return "invalid"
        with open(handle, "rb", closefd=False) as stream:
            content = stream.read(RESULT_LIMIT + 1)
    except _REFUSED:
        return "invalid"
    finally:
        os.close(handle)
    return content if len(content) <= RESULT_LIMIT else "invalid"


def _result(entry: ProjectEntry, case: ExportCase) -> tuple[Path, dict[str, Any]] | RunReason:
    """The case's folder in its latest run and the object of its result.json, or why none."""
    folder = run_folder(entry, case.run)
    if folder is None:
        return "no_run"
    if folder == "invalid":
        return "invalid"
    shots = folder / case.id.lower()
    content = _read_result(shots / "result.json", entry.path)
    if isinstance(content, str):
        return content
    try:
        data = json.loads(content)
    except (ValueError, RecursionError):  # not JSON, not UTF-8, or nested too deep
        return "invalid"
    if not isinstance(data, dict) or not isinstance(data.get("steps"), list):
        return "invalid"
    return shots, data


def _text(raw: Any, key: str) -> str | None:
    value = raw.get(key) if isinstance(raw, dict) else None
    return value if isinstance(value, str) else None


def _screenshot(shots: Path, raw: Any, project: Path) -> Path | None:
    """The screenshot file of a step, when it is a plain name of an image available in `shots`."""
    name = _text(raw, "screenshot")
    if name is None or not _SCREENSHOT.fullmatch(name):
        return None
    file = shots / name
    return file if check(file, [project]) is not None else None


def latest_run(entry: ProjectEntry, case: ExportCase) -> tuple[LatestRun | None, RunReason | None]:
    found = _result(entry, case)
    if isinstance(found, str):
        return None, found
    shots, data = found
    steps = [
        RunStep(
            n=n,
            title=_text(raw, "title") or "",
            status=_text(raw, "status") or "",
            error=_text(raw, "error"),
            screenshot=_screenshot(shots, raw, entry.path) is not None,
        )
        for n, raw in enumerate(data["steps"], start=1)
    ]
    run = LatestRun(
        folder=case.run,
        status=_text(data, "status"),
        started=_text(data, "started"),
        finished=_text(data, "finished"),
        error=_text(data, "error"),
        steps=steps,
    )
    return run, None


def read_screenshot(entry: ProjectEntry, case: ExportCase, n: int) -> tuple[bytes, str] | None:
    """The bytes and type of the screenshot of step `n` of the case's latest run, found and
    checked again now; None for anything else."""
    found = _result(entry, case)
    if isinstance(found, str):
        return None
    shots, data = found
    steps = data["steps"]
    file = _screenshot(shots, steps[n - 1], entry.path) if 1 <= n <= len(steps) else None
    return None if file is None else read_image(file, [entry.path])
