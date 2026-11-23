from fastapi import APIRouter

from gin_console.beads.pull import PullService
from gin_console.beads.snapshot import SnapshotStore
from gin_console.config import Settings
from gin_console.projects.models import ProjectBeads
from gin_console.projects.source import build_project_beads


def build_router(
    settings: Settings,
    snapshots: SnapshotStore,
    pulls: PullService,
) -> APIRouter:
    router = APIRouter()

    @router.get("/projects/beads")
    def get_project_beads() -> list[ProjectBeads]:
        return [
            build_project_beads(entry, snapshots, pulls.result(entry.name))
            for entry in settings.projects
        ]

    return router
