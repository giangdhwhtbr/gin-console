import re
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from functools import partial
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, Response

from gin_console.auth.access import ProjectsOf
from gin_console.beads.errors import BeadsError
from gin_console.beads.router import IMAGE_HEADERS, IMAGE_NOT_FOUND, WorkflowError
from gin_console.beads.service import KeyedCache
from gin_console.beads.snapshot import Snapshot, SnapshotStore
from gin_console.beads.source import valid_id
from gin_console.config import ProjectEntry, Settings
from gin_console.milestones.models import MilestoneDetail
from gin_console.milestones.source import GwRunner, MilestonesError, show_milestone
from gin_console.projects.models import BlockError, EpicWorkflow
from gin_console.qa.models import CaseExport, CaseList, QaErrorBody, Readiness
from gin_console.qa.readiness import build_readiness
from gin_console.qa.runs import read_screenshot
from gin_console.qa.service import build_list, case_detail, find_case
from gin_console.qa.source import GinQaRunner, QaError, load_cases
from gin_console.reports.models import ReportBead
from gin_console.reports.source import read_beads
from gin_console.requirements.models import Trace
from gin_console.requirements.source import GinRunner, RequirementsError, load_trace

TTL = timedelta(seconds=60)
GATE_WORKERS = 4  # `gin state` processes at a time, over every readiness request (REQ-QA-009)
GATE_TIMEOUT = 30.0  # for one `gin state`, as GIN_TIMEOUT: four at once queue on a host
_STEP_NUMBER = re.compile(r"[0-9]{1,3}")  # a step number; anything else is not found


def build_router(
    settings: Settings,
    run_gin_qa: GinQaRunner,
    snapshots: SnapshotStore,
    clock: Callable[[], datetime],
    on_refresh: list[Callable[[], None]],
    projects: ProjectsOf,
    run_gin: GinRunner,
    run_gw: GwRunner,
    run_epic_workflow: Callable[[Path, str], EpicWorkflow | BlockError],
) -> APIRouter:
    router = APIRouter()
    exports = KeyedCache[str, CaseExport](TTL, clock)
    traces = KeyedCache[str, Trace](TTL, clock)
    details = KeyedCache[tuple[str, str], MilestoneDetail](TTL, clock)
    gates = KeyedCache[tuple[str, str], EpicWorkflow](TTL, clock)
    on_refresh += [exports.clear, traces.clear, details.clear, gates.clear]
    gate_pool = ThreadPoolExecutor(max_workers=GATE_WORKERS, thread_name_prefix="qa-gates")

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

    def gates_of(entry: ProjectEntry, epic_id: str) -> EpicWorkflow | BlockError:
        """The kept gates of an epic; a failed `gin state` is raised in the fetch, so it is not
        kept, and answered again as a BlockError."""

        def fetch() -> EpicWorkflow:
            result = run_epic_workflow(entry.path, epic_id)
            if isinstance(result, BlockError):
                raise WorkflowError(result.error)
            return result

        try:
            return gates.get((entry.name, epic_id), fetch)
        except WorkflowError as exc:
            return BlockError(error=str(exc))

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

    @router.get("/qa/readiness/{project}/{milestone}", response_model=Readiness)
    def get_readiness(request: Request, project: str, milestone: str) -> Readiness | JSONResponse:
        """The readiness checklist of a milestone (REQ-QA-009); a failed source makes its item
        unknown, except `gin milestone show`, without which nothing can be scoped."""
        entry = project_entry(request, project)
        if not valid_id(milestone):
            raise HTTPException(status_code=404)
        beads: list[ReportBead] | None = None
        beads_error: str | None = None
        try:
            snapshot = snapshots.get(entry.path)
        except (BeadsError, RecursionError) as exc:
            beads_error = str(exc) or "issues.jsonl was too deeply nested"  # a bare RecursionError
        else:
            if snapshot.rows.get(milestone, {}).get("issue_type") != "milestone":
                raise HTTPException(status_code=404)
            beads = read_beads(snapshot, entry.name, {})
        try:
            detail = details.get(
                (entry.name, milestone), lambda: show_milestone(run_gw, entry.path, milestone, None)
            )
        except MilestonesError as exc:
            return JSONResponse(status_code=502, content={"error": str(exc)})
        trace: Trace | None = None
        trace_error: str | None = None
        try:
            trace = traces.get(entry.name, lambda: load_trace(run_gin, entry.path))
        except RequirementsError as exc:
            trace_error = str(exc)
        export: CaseExport | None = None
        export_error: str | None = None
        try:
            export = export_of(entry)
        except QaError as exc:
            export_error = str(exc)
        ids = [epic.id for epic in detail.epics]
        found = dict(zip(ids, gate_pool.map(partial(gates_of, entry), ids), strict=True))
        return build_readiness(
            detail, trace, trace_error, export, export_error, beads, beads_error, found, clock()
        )

    return router
