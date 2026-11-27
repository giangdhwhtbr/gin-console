from fastapi import APIRouter, Request

from gin_console.auth.access import ProjectsOf
from gin_console.beads.pull import PullService
from gin_console.beads.snapshot import SnapshotStore
from gin_console.config import Settings
from gin_console.projects.models import ProjectBeads
from gin_console.projects.source import build_project_beads


def build_router(
    settings: Settings,
    snapshots: SnapshotStore,
    pulls: PullService,
    projects: ProjectsOf,
) -> APIRouter:
    router = APIRouter()

    @router.get("/projects/beads")
    def get_project_beads(request: Request) -> list[ProjectBeads]:
        return [
            build_project_beads(entry, snapshots, pulls.result(entry.name))
            for entry in projects(request)
        ]

    return router
