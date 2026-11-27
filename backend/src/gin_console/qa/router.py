import re
from collections.abc import Callable
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, Response

from gin_console.auth.access import ProjectsOf
from gin_console.beads.errors import BeadsError
from gin_console.beads.router import IMAGE_HEADERS, IMAGE_NOT_FOUND
from gin_console.beads.service import KeyedCache
from gin_console.beads.snapshot import Snapshot, SnapshotStore
from gin_console.config import ProjectEntry, Settings
from gin_console.qa.models import CaseExport, CaseList, QaErrorBody
from gin_console.qa.runs import read_screenshot
from gin_console.qa.service import build_list, case_detail, find_case
from gin_console.qa.source import GinQaRunner, QaError, load_cases

TTL = timedelta(seconds=60)
_STEP_NUMBER = re.compile(r"[0-9]{1,3}")  # a step number; anything else is not found


def build_router(
    settings: Settings,
    run_gin_qa: GinQaRunner,
    snapshots: SnapshotStore,
    clock: Callable[[], datetime],
    on_refresh: list[Callable[[], None]],
    projects: ProjectsOf,
) -> APIRouter:
    router = APIRouter()
    exports = KeyedCache[str, CaseExport](TTL, clock)
    on_refresh.append(exports.clear)

    def project_entry(request: Request, name: str | None) -> ProjectEntry:
        """A project the request may see (REQ-AUTH-007); 404 for any other, before a cache."""
        entry = next((p for p in projects(request) if p.name == name), None)
        if entry is None or not entry.path.is_dir():
            raise HTTPException(status_code=404)
        return entry

    def export_of(entry: ProjectEntry) -> CaseExport:
        """The kept answer of `gin-qa cases export` (REQ-QA-003); raises QaError."""
        return exports.get(entry.name, lambda: load_cases(run_gin_qa, entry.path))

    def snapshot_of(entry: ProjectEntry) -> Snapshot | None:
        """The project's export snapshot; None when it cannot be read, so a bug keeps its id."""
        try:
            return snapshots.get(entry.path)
        except (BeadsError, RecursionError):
            return None

    def failure(exc: QaError) -> JSONResponse:
        body = QaErrorBody(error=str(exc), cause=exc.cause)
        return JSONResponse(status_code=502, content=body.model_dump())

    @router.get("/qa/cases", response_model=CaseList)
    def get_cases(request: Request, project: str | None = None) -> CaseList | JSONResponse:
        entry = project_entry(request, project)
        try:
            return build_list(export_of(entry))
        except QaError as exc:
            return failure(exc)

    @router.get("/qa/cases/{project}/{case_id}")
    def get_case(request: Request, project: str, case_id: str) -> JSONResponse:
        """One case with its bug and latest run (REQ-QA-004); `bug_detail` is sent as `bug`."""
        entry = project_entry(request, project)
        try:
            export = export_of(entry)
        except QaError as exc:
            return failure(exc)
        found = case_detail(export, snapshot_of(entry), entry, case_id)
        if found is None:
            raise HTTPException(status_code=404)
        return JSONResponse(found.model_dump(mode="json", by_alias=True, exclude={"bug"}))

    @router.get("/qa/cases/{project}/{case_id}/run/steps/{n}/screenshot")
    def get_screenshot(request: Request, project: str, case_id: str, n: str) -> Response:
        """The screenshot of step `n` of a case's latest run, checked again now (REQ-QA-006);
        never a path from the client, and one answer for every failure."""
        not_found = Response(
            status_code=404, content=IMAGE_NOT_FOUND, media_type="application/json"
        )
        if not _STEP_NUMBER.fullmatch(n):
            return not_found
        try:
            entry = project_entry(request, project)
            case = find_case(export_of(entry), case_id)
        except (HTTPException, QaError):  # no project, or no cases to read
            return not_found
        found = None if case is None else read_screenshot(entry, case, int(n))
        if found is None:
            return not_found
        content, media = found
        # a plain response: FileResponse answers a bad Range header without these headers
        return Response(content, media_type=media, headers=IMAGE_HEADERS)

    return router
