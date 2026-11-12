import hashlib
from pathlib import Path

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import JSONResponse, Response
from pydantic import TypeAdapter

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

_LIST = TypeAdapter(list[BeadSummary])


def _tag(body: bytes) -> str:
    return 'W/"' + hashlib.sha256(body).hexdigest()[:16] + '"'


def _matches(if_none_match: str | None, etag: str) -> bool:
    """True when the header names `etag`: `*`, or an entry equal to it, `W/` or not."""
    if if_none_match is None:
        return False
    bare = etag.removeprefix("W/")
    entries = [e.strip() for e in if_none_match.split(",")]
    return any(e == "*" or e.removeprefix("W/") == bare for e in entries)


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
        project: str | None = None,
        closed: str | None = None,
        if_none_match: str | None = Header(default=None),
    ) -> Response:
        cwd = project_dir(project)
        wants_closed = closed == "1"  # any other value means "no": it is never passed on
        try:
            beads = list_beads(snapshots.get(cwd), wants_closed)
        except (BeadsError, RecursionError) as exc:
            return failure(exc)
        body = _LIST.dump_json(beads)
        etag = _tag(body)
        headers = {"ETag": etag, "Cache-Control": "no-cache"}
        if _matches(if_none_match, etag):
            return Response(status_code=304, headers=headers)
        return Response(content=body, media_type="application/json", headers=headers)

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
