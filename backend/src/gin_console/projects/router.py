from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter

from gin_console.beads.snapshot import SnapshotStore
from gin_console.config import Settings
from gin_console.projects.collect import Collector
from gin_console.projects.models import Project, ProjectBeads
from gin_console.projects.source import build_project, build_project_beads, count_beads


def build_router(
    settings: Settings, snapshots: SnapshotStore, on_refresh: list[Callable[[], None]]
) -> APIRouter:
    router = APIRouter()
    collector = Collector(lambda path: count_beads(snapshots, path))
    on_refresh.append(collector.clear)

    @router.get("/projects")
    def get_projects() -> list[Project]:
        if not settings.projects:
            return []
        with ThreadPoolExecutor(max_workers=len(settings.projects)) as pool:
            return list(pool.map(lambda entry: build_project(entry, collector), settings.projects))

    @router.get("/projects/beads")
    def get_project_beads() -> list[ProjectBeads]:
        return [build_project_beads(entry, snapshots) for entry in settings.projects]

    return router
