from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

from gin_console.config import Settings
from gin_console.sessions.models import MessagePage, SessionSummary
from gin_console.sessions.source import find_transcript, list_sessions, read_messages


def build_router(settings: Settings, claude_home: Path) -> APIRouter:
    router = APIRouter()

    @router.get("/sessions")
    def get_sessions(project: str | None = None) -> list[SessionSummary]:
        if project is not None and all(p.name != project for p in settings.projects):
            raise HTTPException(status_code=404)
        return list_sessions(settings, claude_home, project)

    @router.get("/sessions/{project}/{session_id}/messages")
    def get_messages(
        project: str,
        session_id: str,
        offset: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=500),
    ) -> MessagePage:
        entry = next((p for p in settings.projects if p.name == project), None)
        path = find_transcript(claude_home, entry, session_id) if entry else None
        if path is None:
            raise HTTPException(status_code=404)
        try:
            return read_messages(path, offset, limit)
        except OSError:  # the transcript vanished between lookup and read
            raise HTTPException(status_code=404) from None

    return router
