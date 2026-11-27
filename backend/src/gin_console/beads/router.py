import hashlib
import re
from collections.abc import Callable
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from pydantic import TypeAdapter

from gin_console.auth.access import ProjectsOf
from gin_console.beads.images import ImageIndex
from gin_console.beads.models import BeadDetail, BeadSummary, Comment, ProjectMilestones
from gin_console.beads.service import KeyedCache
from gin_console.beads.snapshot import SnapshotStore
from gin_console.beads.source import (
    BeadNotFound,
    BeadsError,
    get_bead,
    get_comments,
    list_beads,
    list_milestones,
    valid_id,
)
from gin_console.config import ProjectEntry, Settings
from gin_console.projects.models import BlockError, EpicWorkflow

_LIST = TypeAdapter(list[BeadSummary])
WORKFLOW_TTL = timedelta(seconds=60)
# one answer for every image that is not served, so a client learns nothing about the files
IMAGE_NOT_FOUND = b'{"error":"not found"}'
IMAGE_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox; default-src 'none'",
    "Content-Disposition": "inline",
    "Cache-Control": "private, no-cache",
}
_IMAGE_NUMBER = re.compile(r"[0-9]{1,3}")  # an image number; anything else is not found


class WorkflowError(Exception):
    """The `gin` command for an epic failed; raised so KeyedCache keeps nothing."""


def _tag(body: bytes) -> str:
    return 'W/"' + hashlib.sha256(body).hexdigest()[:16] + '"'


def _matches(if_none_match: str | None, etag: str) -> bool:
    """True when the header names `etag`: `*`, or an entry equal to it, `W/` or not."""
    if if_none_match is None:
        return False
    bare = etag.removeprefix("W/")
    entries = [e.strip() for e in if_none_match.split(",")]
    return any(e == "*" or e.removeprefix("W/") == bare for e in entries)


def build_router(
    settings: Settings,
    snapshots: SnapshotStore,
    clock: Callable[[], datetime],
    run_epic_workflow: Callable[[Path, str], EpicWorkflow | BlockError],
    on_refresh: list[Callable[[], None]],
    projects: ProjectsOf,
) -> APIRouter:
    router = APIRouter()
    workflows = KeyedCache[tuple[str, str], EpicWorkflow](WORKFLOW_TTL, clock)
    on_refresh.append(workflows.clear)

    images = ImageIndex(Path.home())

    def project_entry(request: Request, name: str | None) -> ProjectEntry:
        """A project the request may see (REQ-AUTH-007); 404 for any other, before a cache."""
        entry = next((p for p in projects(request) if p.name == name), None)
        if entry is None or not entry.path.is_dir():
            raise HTTPException(status_code=404)
        return entry

    def project_dir(request: Request, name: str | None) -> Path:
        return project_entry(request, name).path

    def failure(exc: BeadsError | RecursionError) -> JSONResponse:
        return JSONResponse(
            status_code=502, content={"error": str(exc) or "issues.jsonl was too deeply nested"}
        )

    @router.get("/beads", response_model=list[BeadSummary])
    def get_beads(
        request: Request,
        project: str | None = None,
        closed: str | None = None,
        if_none_match: str | None = Header(default=None),
    ) -> Response:
        entry = project_entry(request, project)
        wants_closed = closed == "1"  # any other value means "no": it is never passed on
        try:
            snapshot = snapshots.get(entry.path)
            beads = list_beads(snapshot, wants_closed, images.of(entry, snapshot))
        except (BeadsError, RecursionError) as exc:
            return failure(exc)
        body = _LIST.dump_json(beads)
        etag = _tag(body)
        headers = {"ETag": etag, "Cache-Control": "no-cache"}
        if _matches(if_none_match, etag):
            return Response(status_code=304, headers=headers)
        return Response(content=body, media_type="application/json", headers=headers)

    @router.get("/beads/milestones", response_model=ProjectMilestones)
    def get_milestones(
        request: Request, project: str | None = None
    ) -> ProjectMilestones | JSONResponse:
        cwd = project_dir(request, project)
        today = clock().astimezone().date()
        try:
            return list_milestones(snapshots.get(cwd), today)
        except (BeadsError, RecursionError) as exc:
            return failure(exc)

    @router.get("/beads/{project}/{bead_id}", response_model=BeadDetail)
    def get_one(request: Request, project: str, bead_id: str) -> BeadDetail | JSONResponse:
        entry = project_entry(request, project)
        if not valid_id(bead_id):
            raise HTTPException(status_code=404)
        try:
            snapshot = snapshots.get(entry.path)
            return get_bead(snapshot, bead_id, images.of(entry, snapshot))
        except BeadNotFound:
            raise HTTPException(status_code=404) from None
        except (BeadsError, RecursionError) as exc:
            return failure(exc)

    @router.get("/beads/{project}/{bead_id}/images/{n}")
    def get_image(request: Request, project: str, bead_id: str, n: str) -> Response:
        """Image `n` of a bead, checked again now (REQ-BEADS-028); never a path from the client."""
        not_found = Response(
            status_code=404, content=IMAGE_NOT_FOUND, media_type="application/json"
        )
        if not valid_id(bead_id) or not _IMAGE_NUMBER.fullmatch(n):
            return not_found
        try:
            entry = project_entry(request, project)
            snapshot = snapshots.get(entry.path)
        except (HTTPException, BeadsError, RecursionError):  # no project, or no beads to read
            return not_found
        found = images.read(entry, snapshot, bead_id, int(n))
        if found is None:
            return not_found
        content, media = found
        # a plain response: FileResponse answers a bad Range header without these headers
        return Response(content, media_type=media, headers=IMAGE_HEADERS)

    @router.get("/beads/{project}/{bead_id}/comments", response_model=list[Comment])
    def get_bead_comments(
        request: Request, project: str, bead_id: str
    ) -> list[Comment] | JSONResponse:
        cwd = project_dir(request, project)
        if not valid_id(bead_id):
            raise HTTPException(status_code=404)
        try:
            return get_comments(snapshots.get(cwd), bead_id)
        except BeadNotFound:
            raise HTTPException(status_code=404) from None
        except (BeadsError, RecursionError) as exc:
            return failure(exc)

    @router.get("/beads/{project}/{bead_id}/workflow", response_model=EpicWorkflow)
    def get_bead_workflow(
        request: Request, project: str, bead_id: str
    ) -> EpicWorkflow | JSONResponse:
        cwd = project_dir(request, project)
        if not valid_id(bead_id):
            raise HTTPException(status_code=404)
        try:
            get_bead(snapshots.get(cwd), bead_id)
        except BeadNotFound:
            raise HTTPException(status_code=404) from None
        except (BeadsError, RecursionError) as exc:
            return failure(exc)

        def fetch() -> EpicWorkflow:
            result = run_epic_workflow(cwd, bead_id)
            if isinstance(result, BlockError):
                raise WorkflowError(result.error)
            return result

        try:
            return workflows.get((project, bead_id), fetch)
        except WorkflowError as exc:
            return JSONResponse(status_code=502, content={"error": str(exc)})

    return router
