"""GET /api/overview (REQ-OVERVIEW-001): every project's snapshot, no process started."""

from collections.abc import Callable
from datetime import datetime

from fastapi import APIRouter, Request

from gin_console.auth.access import ProjectsOf
from gin_console.beads.errors import BeadsError
from gin_console.beads.snapshot import SnapshotStore
from gin_console.config import ProjectEntry, Settings
from gin_console.overview.models import Overview, ProjectOverview
from gin_console.overview.service import build_overview


def build_router(
    settings: Settings,
    snapshots: SnapshotStore,
    clock: Callable[[], datetime],
    projects: ProjectsOf,
) -> APIRouter:
    router = APIRouter()
    aging_days = settings.overview.aging_days

    def one(entry: ProjectEntry, now: datetime) -> ProjectOverview:
        if not entry.path.is_dir():
            return ProjectOverview(name=entry.name, error=f"directory does not exist: {entry.path}")
        try:
            snapshot = snapshots.get(entry.path)
            return build_overview(
                snapshot, entry.name, aging_days, now, snapshots.is_stale(entry.path)
            )
        except (BeadsError, RecursionError) as exc:
            return ProjectOverview(
                name=entry.name, error=str(exc) or "issues.jsonl was too deeply nested"
            )
        except OverflowError:
            return ProjectOverview(name=entry.name, error="issues.jsonl: date out of range")

    @router.get("/overview")
    def get_overview(request: Request) -> Overview:
        now = clock()
        return Overview(
            generated_at=now,
            aging_days=aging_days,
            projects=[one(entry, now) for entry in projects(request)],
        )

    return router
