"""GET /api/reports and GET /api/reports/team (spec REQ-REPORTS-001, 007, 008)."""

import re
from collections.abc import Callable
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from gin_console.beads.service import KeyedCache
from gin_console.beads.snapshot import SnapshotStore
from gin_console.beads.source import BeadsError
from gin_console.config import ProjectEntry, Settings
from gin_console.reports.interactions import InteractionStore
from gin_console.reports.models import Report, TeamReport
from gin_console.reports.service import build_report
from gin_console.reports.source import read_beads
from gin_console.reports.team import build_team

TTL = timedelta(seconds=60)
PERIODS = {"7": 7, "30": 30, "90": 90}
_SPRINT = re.compile(r"[A-Za-z0-9._-]{1,100}")
_MILESTONE = re.compile(r"[A-Za-z0-9._-]{1,200}")


def _message(exc: BeadsError | RecursionError) -> str:
    return str(exc) or "issues.jsonl was too deeply nested"


def build_router(
    settings: Settings,
    snapshots: SnapshotStore,
    interactions: InteractionStore,
    clock: Callable[[], datetime],
    on_refresh: list[Callable[[], None]],
) -> APIRouter:
    router = APIRouter()
    reports = KeyedCache[tuple[str, int, str | None], Report](TTL, clock)
    on_refresh.append(reports.clear)
    team = KeyedCache[tuple[str, str | None], TeamReport](TTL, clock)
    on_refresh.append(team.clear)

    def fetch(entry: ProjectEntry, days: int, sprint: str | None) -> Report:
        beads = read_beads(
            snapshots.get(entry.path), entry.name, interactions.reopens(entry.path)
        )
        return build_report(beads, now=clock(), project=entry.name, days=days, sprint=sprint)

    @router.get("/reports", response_model=Report)
    def get_report(
        project: str | None = None, days: str | None = None, sprint: str | None = None
    ) -> Report | JSONResponse:
        if project is None:
            raise HTTPException(status_code=404)
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
            # a failure is not cached (KeyedCache)
            return reports.get((entry.name, period, sprint), lambda: fetch(entry, period, sprint))
        except (BeadsError, RecursionError) as exc:
            return JSONResponse(status_code=502, content={"error": _message(exc)})

    @router.get("/reports/team", response_model=TeamReport)
    def get_team(
        project: str | None = None, milestone: str | None = None
    ) -> TeamReport | JSONResponse:
        entry = next((p for p in settings.projects if p.name == project), None)
        if entry is None or not entry.path.is_dir():
            raise HTTPException(status_code=404)
        if milestone is not None and _MILESTONE.fullmatch(milestone) is None:
            return JSONResponse(
                status_code=422,
                content={"error": "milestone may hold only letters, digits, '.', '_' and '-'"},
            )
        try:
            return team.get(
                (entry.name, milestone),
                lambda: build_team(
                    read_beads(
                        snapshots.get(entry.path),
                        entry.name,
                        interactions.reopens(entry.path),
                    ),
                    now=clock(),
                    project=entry.name,
                    milestone=milestone,
                ),
            )
        except (BeadsError, RecursionError) as exc:
            return JSONResponse(status_code=502, content={"error": _message(exc)})

    return router
