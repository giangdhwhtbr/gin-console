from collections.abc import Callable
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from gin_console.beads.models import BeadDetail, BeadSummary, Comment, Reopens
from gin_console.beads.service import KeyedCache
from gin_console.beads.snapshot import SnapshotStore
from gin_console.beads.source import (
    BdRunner,
    BeadNotFound,
    BeadsError,
    count_reopens,
    get_bead,
    get_comments,
    list_beads,
    valid_id,
)
from gin_console.config import Settings

REOPENS_TTL = timedelta(days=1)


def build_router(
    settings: Settings, snapshots: SnapshotStore, run: BdRunner, clock: Callable[[], datetime]
) -> APIRouter:
    router = APIRouter()
    # keyed by updated_at: a changed bead gets a new key, so the TTL only ages out old entries
    reopens = KeyedCache[tuple[str, str, str], Reopens](REOPENS_TTL, clock)

    def project_dir(name: str | None) -> Path:
        entry = next((p for p in settings.projects if p.name == name), None)
        if entry is None or not entry.path.is_dir():
            raise HTTPException(status_code=404)
        return entry.path

    def failure(exc: BeadsError | RecursionError) -> JSONResponse:
        return JSONResponse(
            status_code=502, content={"error": str(exc) or "bd output was too deeply nested"}
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

    @router.get("/beads/{project}/{bead_id}/reopens", response_model=Reopens)
    def get_bead_reopens(project: str, bead_id: str) -> Reopens | JSONResponse:
        cwd = project_dir(project)
        if not valid_id(bead_id):
            raise HTTPException(status_code=404)
        try:
            bead = get_bead(snapshots.get(cwd), bead_id)
            return reopens.get(
                (project, bead_id, bead.updated_at),
                lambda: Reopens(reopens=count_reopens(run, cwd, bead_id)),
            )
        except BeadNotFound:
            raise HTTPException(status_code=404) from None
        except (BeadsError, RecursionError) as exc:
            return failure(exc)

    return router
