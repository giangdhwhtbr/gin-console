from collections.abc import Callable
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, Response

from gin_console.auth.access import ProjectsOf, via_grant
from gin_console.beads.service import KeyedCache
from gin_console.config import Settings
from gin_console.requirements.files import (
    list_changes,
    list_mockups,
    mockup_file,
    read_change,
)
from gin_console.requirements.models import (
    ChangeContent,
    ChangeList,
    MockupList,
    Reqs,
    RequirementList,
    RequirementScenarios,
    Trace,
)
from gin_console.requirements.service import build_changes, build_list, find_scenarios
from gin_console.requirements.source import (
    GinRunner,
    RequirementsError,
    load_reqs,
    load_trace,
)

TTL = timedelta(seconds=60)
# mockups run scripts of a project checkout: no console origin, calls, forms or frames (ADR 0004)
POLICY = "sandbox allow-scripts; connect-src 'none'; form-action 'none'; frame-src 'none'"


def build_router(
    settings: Settings,
    run: GinRunner,
    clock: Callable[[], datetime],
    on_refresh: list[Callable[[], None]],
    projects: ProjectsOf,
) -> APIRouter:
    router = APIRouter()
    traces = KeyedCache[str, Trace](TTL, clock)
    reqs = KeyedCache[str, Reqs](TTL, clock)
    on_refresh += [traces.clear, reqs.clear]

    def project_dir(request: Request, name: str | None) -> Path:
        """A project the request may see (REQ-AUTH-007); 404 for any other, before a cache."""
        entry = next((p for p in projects(request) if p.name == name), None)
        if entry is None or not entry.path.is_dir():
            raise HTTPException(status_code=404)
        return entry.path

    def failure(exc: RequirementsError) -> JSONResponse:
        return JSONResponse(status_code=502, content={"error": str(exc), "cause": exc.cause})

    @router.get("/requirements", response_model=RequirementList)
    def get_requirements(
        request: Request, project: str | None = None
    ) -> RequirementList | JSONResponse:
        cwd = project_dir(request, project)
        try:
            return build_list(traces.get(str(project), lambda: load_trace(run, cwd)))
        except RequirementsError as exc:
            return failure(exc)

    @router.get("/requirements/reqs/{project}/{req_id}", response_model=RequirementScenarios)
    def get_scenarios(
        request: Request, project: str, req_id: str
    ) -> RequirementScenarios | JSONResponse:
        cwd = project_dir(request, project)
        try:
            found = find_scenarios(reqs.get(project, lambda: load_reqs(run, cwd)), req_id)
        except RequirementsError as exc:
            return failure(exc)
        if found is None:
            raise HTTPException(status_code=404)
        return found

    @router.get("/requirements/changes", response_model=ChangeList)
    def get_changes(request: Request, project: str | None = None) -> ChangeList:
        cwd = project_dir(request, project)
        folders = list_changes(cwd)
        try:
            trace = traces.get(str(project), lambda: load_trace(run, cwd))
        except RequirementsError as exc:
            return build_changes(folders, None, str(exc), exc.cause)
        return build_changes(folders, trace, None, None)

    @router.get("/requirements/changes/{project}/{change}", response_model=ChangeContent)
    def get_change(request: Request, project: str, change: str) -> ChangeContent:
        found = read_change(project_dir(request, project), change)
        if found is None:
            raise HTTPException(status_code=404)
        return found

    @router.get("/requirements/mockups", response_model=MockupList)
    def get_mockups(request: Request, project: str | None = None) -> MockupList:
        return MockupList(mockups=list_mockups(project_dir(request, project)))

    @router.get("/requirements/mockups/{project}/files/{capability}/{day}/{path:path}")
    def get_mockup_file(
        request: Request, project: str, capability: str, day: str, path: str
    ) -> Response:
        found = mockup_file(project_dir(request, project), capability, day, path)
        if found is None:
            raise HTTPException(status_code=404)
        content, media = found
        # a plain response: FileResponse answers a bad Range header without these headers
        return Response(
            content,
            media_type=media,
            headers={"Content-Security-Policy": POLICY, "X-Content-Type-Options": "nosniff"},
        )

    @router.get("/requirements/mockups/{project}/g/{grant}/files/{capability}/{day}/{path:path}")
    def get_granted_mockup_file(
        request: Request, project: str, grant: str, capability: str, day: str, path: str
    ) -> Response:
        """A mockup's file for its sandboxed page, which sends no cookie (REQ-AUTH-016); only a
        GET the middleware let in by this grant, so 404 while auth is off."""
        if not via_grant(request, grant):
            raise HTTPException(status_code=404)
        return get_mockup_file(request, project, capability, day, path)

    return router
