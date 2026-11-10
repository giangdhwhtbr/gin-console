"""All beads of a project from one `bd export`, kept until the Dolt store changes.

Every `bd` call opens the embedded Dolt store anew (about 0.4 s), so the console reads a
project once and answers lists, details, comments, and counts from memory.
"""

import threading
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from gin_console.beads.errors import BeadsError

TTL_SECONDS = 5.0  # only for a store whose changes cannot be seen (no embedded Dolt manifest)
BLOCKING = ("blocks", "blocked-by")

Exporter = Callable[[Path], Any]


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
    """Index `bd export` rows and work out readiness as `bd ready` and `bd blocked` do:
    a bead that is not closed is blocked by a blocker it has in this store that is not closed,
    or by a blocked ancestor; an open bead that is not blocked is ready."""
    if not isinstance(data, list):
        raise BeadsError("bd export output was not understood")
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


class SnapshotStore:
    """One snapshot per project directory; one export per project at a time."""

    def __init__(
        self,
        export: Exporter,
        signature: Callable[[Path], bytes | None] = store_signature,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._export = export
        self._signature = signature
        self._clock = clock
        self._guard = threading.Lock()
        self._locks: dict[Path, threading.Lock] = {}
        self._items: dict[Path, tuple[bytes | None, float, Snapshot]] = {}

    def clear(self) -> None:
        with self._guard:
            self._items = {}

    def get(self, cwd: Path) -> Snapshot:
        with self._guard:
            lock = self._locks.setdefault(cwd, threading.Lock())
        with lock:
            signature = self._signature(cwd)
            hit = self._items.get(cwd)
            if hit is not None and (
                hit[0] == signature
                if signature is not None
                else hit[0] is None and 0 <= self._clock() - hit[1] < TTL_SECONDS
            ):
                return hit[2]
            snapshot = build_snapshot(self._export(cwd))  # an error propagates, nothing is kept
            # read before the export: a write during it shows up as a change next time
            with self._guard:
                self._items[cwd] = (signature, self._clock(), snapshot)
            return snapshot
