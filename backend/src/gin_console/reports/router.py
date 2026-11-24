"""GET /api/reports, /team and /status (spec REQ-REPORTS-001, 007, 008, 020)."""

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
from gin_console.reports.models import Report, ReportBead, StatusReport, TeamReport
from gin_console.reports.scope import (
    MilestoneScope,
    PeriodScope,
    Scope,
    day_of,
    list_milestones,
)
from gin_console.reports.service import build_report
from gin_console.reports.source import read_beads
from gin_console.reports.status import build_status
from gin_console.reports.team import build_team

TTL = timedelta(seconds=60)
PERIODS = {"7": 7, "30": 30, "90": 90}
_MILESTONE = re.compile(r"[A-Za-z0-9._-]{1,200}")


def _message(exc: BeadsError | RecursionError) -> str:
    return str(exc) or "issues.jsonl was too deeply nested"


def parse_scope(milestone: str | None, days: str | None) -> Scope | None | JSONResponse:
    """None when neither key is given; a 422 answer for a bad or doubled scope."""
    if milestone is not None and days is not None:
        return JSONResponse(status_code=422, content={"error": "give milestone or days, not both"})
    if days is not None:
        if days not in PERIODS:
            return JSONResponse(status_code=422, content={"error": "days must be 7, 30 or 90"})
        return PeriodScope(PERIODS[days])
    if milestone is not None:
        if _MILESTONE.fullmatch(milestone) is None:
            return JSONResponse(
                status_code=422,
                content={"error": "milestone may hold only letters, digits, '.', '_' and '-'"},
            )
        return MilestoneScope(milestone)
    return None


class _UnknownMilestone(LookupError):
    pass


def build_router(
    settings: Settings,
    snapshots: SnapshotStore,
    interactions: InteractionStore,
    clock: Callable[[], datetime],
    on_refresh: list[Callable[[], None]],
) -> APIRouter:
    router = APIRouter()
    reports = KeyedCache[tuple[str, Scope], Report](TTL, clock)
    on_refresh.append(reports.clear)
    team = KeyedCache[tuple[str, Scope | None], TeamReport](TTL, clock)
    on_refresh.append(team.clear)
    status = KeyedCache[tuple[str, Scope | None], StatusReport](TTL, clock)
    on_refresh.append(status.clear)

    def beads_of(entry: ProjectEntry) -> list[ReportBead]:
        return read_beads(snapshots.get(entry.path), entry.name, interactions.reopens(entry.path))

    def fetch(entry: ProjectEntry, scope: Scope) -> Report:
        beads = beads_of(entry)
        now = clock()
        if isinstance(scope, MilestoneScope):
            listed, _ = list_milestones(beads, day_of(now))
            if scope.id not in {m.id for m in listed}:
                raise _UnknownMilestone(scope.id)
        return build_report(beads, now=now, project=entry.name, scope=scope)

    def find(project: str | None) -> ProjectEntry:
        entry = next((p for p in settings.projects if p.name == project), None)
        if entry is None or not entry.path.is_dir():
            raise HTTPException(status_code=404)
        return entry

    @router.get("/reports", response_model=Report)
    def get_report(
        project: str | None = None, milestone: str | None = None, days: str | None = None
    ) -> Report | JSONResponse:
        entry = find(project)
        scope = parse_scope(milestone, days)
        if isinstance(scope, JSONResponse):
            return scope
        scope = scope or PeriodScope(30)
        try:
            # a failure is not cached (KeyedCache)
            return reports.get((entry.name, scope), lambda: fetch(entry, scope))
        except _UnknownMilestone:
            return JSONResponse(status_code=404, content={"error": "unknown milestone"})
        except (BeadsError, RecursionError) as exc:
            return JSONResponse(status_code=502, content={"error": _message(exc)})

    @router.get("/reports/team", response_model=TeamReport)
    def get_team(
        project: str | None = None, milestone: str | None = None, days: str | None = None
    ) -> TeamReport | JSONResponse:
        entry = find(project)
        scope = parse_scope(milestone, days)
        if isinstance(scope, JSONResponse):
            return scope
        try:
            return team.get(
                (entry.name, scope),
                lambda: build_team(beads_of(entry), now=clock(), project=entry.name, scope=scope),
            )
        except (BeadsError, RecursionError) as exc:
            return JSONResponse(status_code=502, content={"error": _message(exc)})

    @router.get("/reports/status", response_model=StatusReport)
    def get_status(
        project: str | None = None, milestone: str | None = None, days: str | None = None
    ) -> StatusReport | JSONResponse:
        entry = find(project)
        scope = parse_scope(milestone, days)
        if isinstance(scope, JSONResponse):
            return scope
        try:
            return status.get(
                (entry.name, scope),
                lambda: build_status(beads_of(entry), now=clock(), project=entry.name, scope=scope),
            )
        except (BeadsError, RecursionError) as exc:
            return JSONResponse(status_code=502, content={"error": _message(exc)})

    return router
