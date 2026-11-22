"""Reopens per bead from a project's `.beads/interactions.jsonl` (REQ-REPORTS-019)."""

import json
import threading
from collections import Counter
from collections.abc import Callable
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


def read_reopens(path: Path) -> dict[str, int]:
    """Reopens per bead id. A missing or unreadable log is an expected case (a project
    without interactions, a log bd has not written yet): it counts nothing, so a report
    never fails on it. A line that is not JSON counts nothing either."""
    found: Counter[str] = Counter()
    try:
        with path.open(encoding="utf-8") as handle:
            for text in handle:
                try:
                    ident = _is_reopen(json.loads(text))
                except ValueError:
                    continue
                if ident is not None:
                    found[ident] += 1
    except OSError:
        return {}
    return dict(found)


class InteractionStore:
    """Reopens per project directory, read again only when the log's size or mtime changed."""

    def __init__(self, read: Callable[[Path], dict[str, int]] = read_reopens) -> None:
        self._read = read
        self._guard = threading.Lock()
        self._items: dict[Path, tuple[tuple[int, int], dict[str, int]]] = {}

    def reopens(self, project_dir: Path) -> dict[str, int]:
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
