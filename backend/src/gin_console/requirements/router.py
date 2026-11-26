from collections.abc import Callable
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, Response

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
) -> APIRouter:
    router = APIRouter()
    traces = KeyedCache[str, Trace](TTL, clock)
    reqs = KeyedCache[str, Reqs](TTL, clock)
    on_refresh += [traces.clear, reqs.clear]

    def project_dir(name: str | None) -> Path:
        entry = next((p for p in settings.projects if p.name == name), None)
        if entry is None or not entry.path.is_dir():
            raise HTTPException(status_code=404)
        return entry.path

    def failure(exc: RequirementsError) -> JSONResponse:
        return JSONResponse(status_code=502, content={"error": str(exc), "cause": exc.cause})

    @router.get("/requirements", response_model=RequirementList)
    def get_requirements(project: str | None = None) -> RequirementList | JSONResponse:
        cwd = project_dir(project)
        try:
            return build_list(traces.get(str(project), lambda: load_trace(run, cwd)))
        except RequirementsError as exc:
            return failure(exc)

    @router.get("/requirements/reqs/{project}/{req_id}", response_model=RequirementScenarios)
    def get_scenarios(project: str, req_id: str) -> RequirementScenarios | JSONResponse:
        cwd = project_dir(project)
        try:
            found = find_scenarios(reqs.get(project, lambda: load_reqs(run, cwd)), req_id)
        except RequirementsError as exc:
            return failure(exc)
        if found is None:
            raise HTTPException(status_code=404)
        return found

    @router.get("/requirements/changes", response_model=ChangeList)
    def get_changes(project: str | None = None) -> ChangeList:
        cwd = project_dir(project)
        folders = list_changes(cwd)
        try:
            trace = traces.get(str(project), lambda: load_trace(run, cwd))
        except RequirementsError as exc:
            return build_changes(folders, None, str(exc), exc.cause)
        return build_changes(folders, trace, None, None)

    @router.get("/requirements/changes/{project}/{change}", response_model=ChangeContent)
    def get_change(project: str, change: str) -> ChangeContent:
        found = read_change(project_dir(project), change)
        if found is None:
            raise HTTPException(status_code=404)
        return found

    @router.get("/requirements/mockups", response_model=MockupList)
    def get_mockups(project: str | None = None) -> MockupList:
        return MockupList(mockups=list_mockups(project_dir(project)))

    @router.get("/requirements/mockups/{project}/files/{capability}/{day}/{path:path}")
    def get_mockup_file(project: str, capability: str, day: str, path: str) -> Response:
        found = mockup_file(project_dir(project), capability, day, path)
        if found is None:
            raise HTTPException(status_code=404)
        content, media = found
        # a plain response: FileResponse answers a bad Range header without these headers
        return Response(
            content,
            media_type=media,
            headers={"Content-Security-Policy": POLICY, "X-Content-Type-Options": "nosniff"},
        )

    return router
