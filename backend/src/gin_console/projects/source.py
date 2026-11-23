"""Projects come from the console config; existence and state are checked on every call."""

from pathlib import Path

from gin_console.beads.definitions import counts_toward, is_blocked
from gin_console.beads.errors import BeadsError
from gin_console.beads.lanes import is_merge_gate
from gin_console.beads.prep import row_is_prep
from gin_console.beads.snapshot import SnapshotStore
from gin_console.config import ProjectEntry
from gin_console.projects.models import Beads, BlockError, Epic, ProjectBeads, PullResult


def count_beads(snapshots: SnapshotStore, path: Path) -> Beads | BlockError:
    try:
        rows = snapshots.get(path)
    except (BeadsError, RecursionError) as exc:
        return BlockError(error=str(exc) or "issues.jsonl was too deeply nested")
    # prep tasks are counted apart (REQ-BEADS-002)
    # merge gates are counted nowhere (REQ-BEADS-019)
    gate_ids = {i for i, r in rows.rows.items() if is_merge_gate(r)}
    prep_ids = {i for i, r in rows.rows.items() if row_is_prep(r)} - gate_ids
    left_out = prep_ids | gate_ids
    open_rows = [r for r in rows.rows.values() if r.get("status") in ("open", "in_progress")]
    active = [r for r in open_rows if r.get("id") not in left_out]
    # a milestone is not work, even when nothing blocks it (REQ-MILESTONE-UI-007)
    ready = {
        i for i in rows.ready if rows.rows[i].get("issue_type") != "milestone" and i not in left_out
    }
    try:
        return Beads(
            open=sum(r["status"] == "open" for r in active),
            in_progress=sum(
                r["status"] == "in_progress" and not is_blocked(r["id"], r, rows) for r in active
            ),
            blocked=sum(
                1
                for i, r in rows.rows.items()
                if i not in left_out and counts_toward(r) and is_blocked(i, r, rows)
            ),
            ready=len(ready),
            prep=sum(r.get("status") != "closed" for i, r in rows.rows.items() if i in prep_ids),
            epics=[
                Epic(id=r["id"], title=r["title"], status=r["status"])
                for r in active
                if r.get("issue_type") == "epic"
                and (r["status"] == "in_progress" or r["id"] in ready)
            ],
            stale=snapshots.is_stale(path),
        )
    except (KeyError, TypeError, ValueError) as exc:
        return BlockError(error=f"issues.jsonl: unexpected content ({exc!r})")


def build_project_beads(
    entry: ProjectEntry, snapshots: SnapshotStore, pull: PullResult | None
) -> ProjectBeads:
    exists = entry.path.is_dir()
    return ProjectBeads(
        name=entry.name,
        path=str(entry.path),
        exists=exists,
        beads=count_beads(snapshots, entry.path) if exists else None,
        pull=pull,
    )
