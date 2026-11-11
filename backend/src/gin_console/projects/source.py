"""Projects come from the console config; existence and state are checked on every call."""

from pathlib import Path

from gin_console.beads.errors import BeadsError
from gin_console.beads.snapshot import SnapshotStore
from gin_console.config import ProjectEntry
from gin_console.projects.collect import Collector
from gin_console.projects.models import Beads, BlockError, Epic, Project


def count_beads(snapshots: SnapshotStore, path: Path) -> Beads | BlockError:
    try:
        rows = snapshots.get(path)
    except (BeadsError, RecursionError) as exc:
        return BlockError(error=str(exc) or "issues.jsonl was too deeply nested")
    active = [r for r in rows.rows.values() if r.get("status") in ("open", "in_progress")]
    # a milestone is not work, even when nothing blocks it (REQ-MILESTONE-UI-007)
    ready = {
        i for i in rows.ready if rows.rows[i].get("issue_type") != "milestone"
    }
    try:
        return Beads(
            open=sum(r["status"] == "open" for r in active),
            in_progress=sum(r["status"] == "in_progress" for r in active),
            blocked=len(rows.blocked),
            ready=len(ready),
            epics=[
                Epic(id=r["id"], title=r["title"])
                for r in active
                if r.get("issue_type") == "epic"
                and (r["status"] == "in_progress" or r["id"] in ready)
            ],
            stale=snapshots.is_stale(path),
        )
    except (KeyError, TypeError, ValueError) as exc:
        return BlockError(error=f"issues.jsonl: unexpected content ({exc!r})")


def build_project(entry: ProjectEntry, collector: Collector) -> Project:
    exists = entry.path.is_dir()
    workflow, beads = collector.get(entry.name, entry.path) if exists else (None, None)
    return Project(
        name=entry.name,
        path=str(entry.path),
        exists=exists,
        workflow=workflow,
        beads=beads,
    )
