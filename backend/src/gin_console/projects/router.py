from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter

from gin_console.config import Settings
from gin_console.projects.collect import Collector
from gin_console.projects.models import Project
from gin_console.projects.source import build_project


def build_router(settings: Settings) -> APIRouter:
    router = APIRouter()
    collector = Collector()

    @router.get("/projects")
    def get_projects() -> list[Project]:
        if not settings.projects:
            return []
        with ThreadPoolExecutor(max_workers=len(settings.projects)) as pool:
            return list(pool.map(lambda entry: build_project(entry, collector), settings.projects))

    return router
