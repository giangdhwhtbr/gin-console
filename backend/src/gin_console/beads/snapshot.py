"""All beads of a project from its `.beads/issues.jsonl`, kept until the file changes; stale
when the Dolt store changed after the file was read.

The console reads a project's file once and answers lists, details, comments, and counts from
memory; it never starts `bd`.
"""

import threading
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from gin_console.beads.errors import BeadsError

EXPORT_FILE = Path(".beads") / "issues.jsonl"
BLOCKING = ("blocks", "blocked-by")

Reader = Callable[[Path], Any]
FileKey = tuple[int, int] | None


@dataclass(frozen=True)
class Snapshot:
    """`rows` in export order; `parents` from parent-child rows; `dependents[id]` holds
    (issue_id, type) of each bead that depends on `id`."""

    rows: dict[str, dict[str, Any]]
    parents: dict[str, str] = field(default_factory=dict)
    dependents: dict[str, list[tuple[str, str]]] = field(default_factory=dict)
    blocked: frozenset[str] = frozenset()
    ready: frozenset[str] = frozenset()


def _deps(row: dict[str, Any]) -> list[tuple[str, str]]:
    """(depends_on_id, type) of a row's own dependencies; malformed entries are skipped."""
    deps = row.get("dependencies")
    out: list[tuple[str, str]] = []
    for dep in deps if isinstance(deps, list) else []:
        if not isinstance(dep, dict) or dep.get("issue_id") != row["id"]:
            continue
        target, kind = dep.get("depends_on_id"), dep.get("type")
        if isinstance(target, str) and isinstance(kind, str):
            out.append((target, kind))
    return out


def build_snapshot(data: Any) -> Snapshot:
    """Index exported rows and work out readiness as `bd ready` and `bd blocked` do:
    a bead that is not closed is blocked by a blocker it has in this store that is not closed,
    or by a blocked ancestor; an open bead that is not blocked is ready."""
    if not isinstance(data, list):
        raise BeadsError(f"{EXPORT_FILE.as_posix()} was not understood")
    rows = {
        row["id"]: row for row in data if isinstance(row, dict) and isinstance(row.get("id"), str)
    }
    parents: dict[str, str] = {}
    dependents: dict[str, list[tuple[str, str]]] = {}
    direct: set[str] = set()
    for ident, row in rows.items():
        for target, kind in _deps(row):
            dependents.setdefault(target, []).append((ident, kind))
            if kind == "parent-child":
                parents.setdefault(ident, target)
            elif (
                kind in BLOCKING
                and row.get("status") != "closed"
                and target in rows  # external and missing targets block nothing, as in bd
                and rows[target].get("status") != "closed"
            ):
                direct.add(ident)

    def blocked_ancestor(ident: str) -> bool:
        seen = {ident}
        parent = parents.get(ident)
        while parent is not None and parent not in seen and parent in rows:
            if parent in direct:
                return True
            seen.add(parent)
            parent = parents.get(parent)
        return False

    blocked = frozenset(
        ident
        for ident, row in rows.items()
        if row.get("status") != "closed" and (ident in direct or blocked_ancestor(ident))
    )
    ready = frozenset(
        ident for ident, row in rows.items() if row.get("status") == "open" and ident not in blocked
    )
    return Snapshot(rows, parents, dependents, blocked, ready)


def store_signature(cwd: Path) -> bytes | None:
    """The embedded Dolt manifests: their content changes on each write and on no read
    (their mtime changes on every read). None when there is none to watch."""
    manifests = sorted((cwd / ".beads" / "embeddeddolt").glob("*/.dolt/noms/manifest"))
    if not manifests:
        return None
    try:
        return b"\0".join(path.read_bytes() for path in manifests)
    except OSError:
        return None


def export_key(cwd: Path) -> FileKey:
    """(st_mtime_ns, st_size) of the export file: bd rewrites it on each exported write.
    None when it cannot be seen."""
    try:
        st = (cwd / EXPORT_FILE).stat()
    except OSError:
        return None
    return (st.st_mtime_ns, st.st_size)


class SnapshotStore:
    """One snapshot per project directory; one read per project at a time."""

    def __init__(
        self,
        read: Reader,
        file_key: Callable[[Path], FileKey] = export_key,
        signature: Callable[[Path], bytes | None] = store_signature,
    ) -> None:
        self._read = read
        self._file_key = file_key
        self._signature = signature
        self._guard = threading.Lock()
        self._locks: dict[Path, threading.Lock] = {}
        self._items: dict[Path, tuple[FileKey, bytes | None, Snapshot]] = {}

    def clear(self) -> None:
        with self._guard:
            self._items = {}

    def get(self, cwd: Path) -> Snapshot:
        with self._guard:
            lock = self._locks.setdefault(cwd, threading.Lock())
        with lock:
            key = self._file_key(cwd)
            with self._guard:
                hit = self._items.get(cwd)
            if key is not None and hit is not None and hit[0] == key:
                return hit[2]
            # read before the file: a write during the read shows as stale, not as fresh
            signature = self._signature(cwd)
            snapshot = build_snapshot(self._read(cwd))  # an error propagates, nothing is kept
            with self._guard:
                self._items[cwd] = (key, signature, snapshot)
            return snapshot

    def is_stale(self, cwd: Path) -> bool:
        """The Dolt store changed since the kept snapshot was read, and the file did not."""
        with self._guard:
            hit = self._items.get(cwd)
        if hit is None or hit[1] is None:
            return False
        return self._signature(cwd) not in (None, hit[1])
