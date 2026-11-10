from collections.abc import Callable
from datetime import date, datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from gin_console.beads.service import KeyedCache
from gin_console.beads.source import valid_id
from gin_console.config import Settings
from gin_console.milestones.models import MilestoneDetail, MilestoneList
from gin_console.milestones.source import (
    GwRunner,
    MilestonesError,
    list_milestones,
    show_milestone,
)

TTL = timedelta(seconds=5)


def build_router(
    settings: Settings,
    run: GwRunner,
    clock: Callable[[], datetime],
    on_refresh: list[Callable[[], None]],
) -> APIRouter:
    router = APIRouter()
    lists = KeyedCache[str, MilestoneList](TTL, clock)
    details = KeyedCache[tuple[str, str], MilestoneDetail](TTL, clock)
    on_refresh += [lists.clear, details.clear]

    def project_dir(name: str | None) -> Path:
        entry = next((p for p in settings.projects if p.name == name), None)
        if entry is None or not entry.path.is_dir():
            raise HTTPException(status_code=404)
        return entry.path

    def failure(exc: MilestonesError) -> JSONResponse:
        return JSONResponse(status_code=502, content={"error": str(exc), "cause": exc.cause})

    @router.get("/milestones", response_model=MilestoneList)
    def get_milestones(project: str | None = None) -> MilestoneList | JSONResponse:
        cwd = project_dir(project)
        try:
            return lists.get(str(project), lambda: list_milestones(run, cwd))
        except MilestonesError as exc:
            return failure(exc)

    @router.get("/milestones/{project}/{milestone_id}", response_model=MilestoneDetail)
    def get_milestone(
        project: str, milestone_id: str, start: date | None = None
    ) -> MilestoneDetail | JSONResponse:
        cwd = project_dir(project)
        if not valid_id(milestone_id):
            raise HTTPException(status_code=404)
        try:
            if start is not None:  # a preview is asked once per pick: never cached
                return show_milestone(run, cwd, milestone_id, start)
            return details.get(
                (project, milestone_id), lambda: show_milestone(run, cwd, milestone_id, None)
            )
        except MilestonesError as exc:
            return failure(exc)

    return router
