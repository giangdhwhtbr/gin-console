from collections.abc import Callable
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from gin_console.beads.service import KeyedCache
from gin_console.config import Settings
from gin_console.requirements.models import (
    Reqs,
    RequirementList,
    RequirementScenarios,
    Trace,
)
from gin_console.requirements.service import build_list, find_scenarios
from gin_console.requirements.source import (
    GinRunner,
    RequirementsError,
    load_reqs,
    load_trace,
)

TTL = timedelta(seconds=60)


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

    return router
