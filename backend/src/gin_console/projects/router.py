from fastapi import APIRouter

from gin_console.config import Settings
from gin_console.projects.models import Project
from gin_console.projects.source import list_projects


def build_router(settings: Settings) -> APIRouter:
    router = APIRouter()

    @router.get("/projects")
    def get_projects() -> list[Project]:
        return list_projects(settings)

    return router
