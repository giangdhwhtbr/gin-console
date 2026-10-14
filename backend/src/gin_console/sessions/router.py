from pathlib import Path

from fastapi import APIRouter, HTTPException

from gin_console.config import Settings
from gin_console.sessions.models import SessionSummary
from gin_console.sessions.source import list_sessions


def build_router(settings: Settings, claude_home: Path) -> APIRouter:
    router = APIRouter()

    @router.get("/sessions")
    def get_sessions(project: str | None = None) -> list[SessionSummary]:
        if project is not None and all(p.name != project for p in settings.projects):
            raise HTTPException(status_code=404)
        return list_sessions(settings, claude_home, project)

    return router
