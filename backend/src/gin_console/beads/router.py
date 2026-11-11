from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from gin_console.beads.models import BeadDetail, BeadSummary, Comment
from gin_console.beads.snapshot import SnapshotStore
from gin_console.beads.source import (
    BeadNotFound,
    BeadsError,
    get_bead,
    get_comments,
    list_beads,
    valid_id,
)
from gin_console.config import Settings


def build_router(settings: Settings, snapshots: SnapshotStore) -> APIRouter:
    router = APIRouter()

    def project_dir(name: str | None) -> Path:
        entry = next((p for p in settings.projects if p.name == name), None)
        if entry is None or not entry.path.is_dir():
            raise HTTPException(status_code=404)
        return entry.path

    def failure(exc: BeadsError | RecursionError) -> JSONResponse:
        return JSONResponse(
            status_code=502, content={"error": str(exc) or "issues.jsonl was too deeply nested"}
        )

    @router.get("/beads", response_model=list[BeadSummary])
    def get_beads(
        project: str | None = None, closed: str | None = None
    ) -> list[BeadSummary] | JSONResponse:
        cwd = project_dir(project)
        wants_closed = closed == "1"  # any other value means "no": it is never passed on
        try:
            return list_beads(snapshots.get(cwd), wants_closed)
        except (BeadsError, RecursionError) as exc:
            return failure(exc)

    @router.get("/beads/{project}/{bead_id}", response_model=BeadDetail)
    def get_one(project: str, bead_id: str) -> BeadDetail | JSONResponse:
        cwd = project_dir(project)
        if not valid_id(bead_id):
            raise HTTPException(status_code=404)
        try:
            return get_bead(snapshots.get(cwd), bead_id)
        except BeadNotFound:
            raise HTTPException(status_code=404) from None
        except (BeadsError, RecursionError) as exc:
            return failure(exc)

    @router.get("/beads/{project}/{bead_id}/comments", response_model=list[Comment])
    def get_bead_comments(project: str, bead_id: str) -> list[Comment] | JSONResponse:
        cwd = project_dir(project)
        if not valid_id(bead_id):
            raise HTTPException(status_code=404)
        try:
            return get_comments(snapshots.get(cwd), bead_id)
        except BeadNotFound:
            raise HTTPException(status_code=404) from None
        except (BeadsError, RecursionError) as exc:
            return failure(exc)

    return router
