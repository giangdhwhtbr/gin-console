"""Reopens per bead from a project's `.beads/interactions.jsonl` (REQ-REPORTS-019)."""

import json
import threading
from collections.abc import Callable
from datetime import date, datetime
from pathlib import Path

LOG = Path(".beads/interactions.jsonl")


def _is_reopen(line: object) -> str | None:
    """The bead id when `line` is a status change away from `closed`, else None."""
    if not isinstance(line, dict) or line.get("kind") != "field_change":
        return None
    extra = line.get("extra")
    ident = line.get("issue_id")
    if not isinstance(extra, dict) or not isinstance(ident, str):
        return None
    new = extra.get("new_value")
    if extra.get("field") == "status" and extra.get("old_value") == "closed":
        if isinstance(new, str) and new != "closed":
            return ident
    return None


def _day_of(line: object) -> date:
    """The local date of a line's `created_at`, or `date.min` so the reopen still counts."""
    stamp = line.get("created_at") if isinstance(line, dict) else None
    try:
        return (
            datetime.fromisoformat(stamp).astimezone().date()
            if isinstance(stamp, str)
            else date.min
        )
    except ValueError:
        return date.min


def read_reopens(path: Path) -> dict[str, list[date]]:
    """Dates of the reopens per bead id. A missing or unreadable log is an expected case (a project
    without interactions, a log bd has not written yet): it counts nothing, so a report
    never fails on it. A line that is not JSON counts nothing either."""
    found: dict[str, list[date]] = {}
    try:
        with path.open(encoding="utf-8") as handle:
            for text in handle:
                try:
                    line = json.loads(text)
                except ValueError:
                    continue
                ident = _is_reopen(line)
                if ident is not None:
                    found.setdefault(ident, []).append(_day_of(line))
    except OSError:
        return {}
    return found


class InteractionStore:
    """Reopens per project directory, read again only when the log's size or mtime changed."""

    def __init__(self, read: Callable[[Path], dict[str, list[date]]] = read_reopens) -> None:
        self._read = read
        self._guard = threading.Lock()
        self._items: dict[Path, tuple[tuple[int, int], dict[str, list[date]]]] = {}

    def reopens(self, project_dir: Path) -> dict[str, list[date]]:
        path = project_dir / LOG
        try:
            st = path.stat()
        except OSError:
            return {}  # no log: nothing to count, nothing to keep
        key = (st.st_size, st.st_mtime_ns)
        with self._guard:
            hit = self._items.get(project_dir)
            if hit is not None and hit[0] == key:
                return hit[1]
            counts = self._read(path)
            self._items[project_dir] = (key, counts)
            return counts
