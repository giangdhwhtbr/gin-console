"""GET /api/reports (spec REQ-REPORTS-001, REQ-REPORTS-007)."""

import re
from collections.abc import Callable
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from gin_console.beads.service import KeyedCache
from gin_console.beads.snapshot import SnapshotStore
from gin_console.beads.source import BeadsError
from gin_console.config import Settings
from gin_console.reports.models import ProjectError, Report, ReportBead
from gin_console.reports.service import build_report
from gin_console.reports.source import read_beads

TTL = timedelta(seconds=60)
ALL = "all"
PERIODS = {"7": 7, "30": 30, "90": 90}
_SPRINT = re.compile(r"[A-Za-z0-9._-]{1,100}")


def _message(exc: BeadsError | RecursionError) -> str:
    return str(exc) or "issues.jsonl was too deeply nested"


def build_router(
    settings: Settings,
    snapshots: SnapshotStore,
    clock: Callable[[], datetime],
    on_refresh: list[Callable[[], None]],
) -> APIRouter:
    router = APIRouter()
    reports = KeyedCache[tuple[str, int, str | None], Report](TTL, clock)
    on_refresh.append(reports.clear)

    def fetch(project: str, days: int, sprint: str | None) -> Report:
        entries = (
            settings.projects
            if project == ALL
            else [p for p in settings.projects if p.name == project]
        )
        beads: list[ReportBead] = []
        errors: list[ProjectError] = []
        for entry in entries:
            if not entry.path.is_dir():
                errors.append(
                    ProjectError(project=entry.name, error="project directory does not exist")
                )
                continue
            try:
                beads.extend(read_beads(snapshots.get(entry.path), entry.name))
            except (BeadsError, RecursionError) as exc:
                if project != ALL:
                    raise
                errors.append(ProjectError(project=entry.name, error=_message(exc)))
        if project == ALL and entries and len(errors) == len(entries):
            raise BeadsError("; ".join(f"{e.project}: {e.error}" for e in errors))
        return build_report(
            beads, now=clock(), project=project, days=days, sprint=sprint, errors=errors
        )

    @router.get("/reports", response_model=Report)
    def get_report(
        project: str | None = None, days: str | None = None, sprint: str | None = None
    ) -> Report | JSONResponse:
        if project is None:
            raise HTTPException(status_code=404)
        if project != ALL:
            entry = next((p for p in settings.projects if p.name == project), None)
            if entry is None or not entry.path.is_dir():
                raise HTTPException(status_code=404)
        period = PERIODS.get(days or "30")
        if period is None:
            return JSONResponse(status_code=422, content={"error": "days must be 7, 30 or 90"})
        if sprint is not None and _SPRINT.fullmatch(sprint) is None:
            return JSONResponse(
                status_code=422,
                content={"error": "sprint may hold only letters, digits, '.', '_' and '-'"},
            )
        try:
            # a partial "all" answer is a success and is cached; a failure is not (KeyedCache)
            return reports.get((project, period, sprint), lambda: fetch(project, period, sprint))
        except (BeadsError, RecursionError) as exc:
            return JSONResponse(status_code=502, content={"error": _message(exc)})

    return router
