import re
from collections.abc import Callable
from datetime import date, datetime, timedelta
from functools import partial
from pathlib import Path
from typing import Annotated, Literal
from urllib.parse import quote

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse, Response

from gin_console.beads.errors import BeadsError
from gin_console.beads.service import KeyedCache
from gin_console.beads.snapshot import SnapshotStore
from gin_console.beads.source import valid_id
from gin_console.config import Settings
from gin_console.milestones.models import MilestoneDetail, MilestoneList
from gin_console.milestones.source import (
    GwRunner,
    MilestonesError,
    list_milestones,
    show_milestone,
    with_epic_states,
)
from gin_console.milestones.wbs import build_wbs
from gin_console.milestones.wbs_formats import to_csv, to_markdown, to_xlsx

TTL = timedelta(seconds=5)
XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
WbsFormat = Literal["xlsx", "csv", "md"]
UNSAFE_FILENAME = re.compile(r"[^A-Za-z0-9._-]")


def header_safe(text: str) -> str:
    """One ASCII line, so Starlette can encode it as an HTTP header value."""
    return " ".join(text.encode("ascii", "replace").decode("ascii").split())


def attachment(filename: str) -> str:
    """`filename="..."` as the spec shows for plain names; an ASCII fallback plus the RFC 5987
    `filename*` when the name has spaces, quotes, or non-ASCII characters."""
    plain = UNSAFE_FILENAME.sub("_", filename)
    if plain == filename:
        return f'attachment; filename="{filename}"'
    return f"attachment; filename=\"{plain}\"; filename*=UTF-8''{quote(filename, safe='')}"


def build_router(
    settings: Settings,
    run: GwRunner,
    clock: Callable[[], datetime],
    on_refresh: list[Callable[[], None]],
    snapshots: SnapshotStore,
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
            listing = lists.get(str(project), lambda: list_milestones(run, cwd))
        except MilestonesError as exc:
            return failure(exc)
        try:
            snapshot = snapshots.get(cwd)
        except BeadsError:
            snapshot = None  # REQ-MILESTONE-UI-025: no readable export, so the fallback counts
        return with_epic_states(listing, snapshot)

    @router.get("/milestones/{project}/wbs")
    def get_wbs(  # REQ-MILESTONE-UI-026
        project: str,
        format: WbsFormat,
        milestone: Annotated[str | None, Query(pattern=r"^[A-Za-z0-9._-]+$")] = None,
    ) -> Response:
        cwd = project_dir(project)
        try:
            snapshot = snapshots.get(cwd)
        except BeadsError as exc:
            return JSONResponse(status_code=502, content={"error": str(exc)})
        rows = snapshot.rows
        if milestone is not None and rows.get(milestone, {}).get("issue_type") != "milestone":
            raise HTTPException(status_code=404)
        warnings: list[str] = []
        listing: MilestoneList | None = None
        try:
            listing = lists.get(project, lambda: list_milestones(run, cwd))
        except MilestonesError as exc:
            warnings.append(f"gin milestone list failed: {exc}")
        wanted = (
            [milestone]
            if milestone is not None
            else [m.id for m in listing.milestones]
            if listing
            else []
        )
        shown: dict[str, MilestoneDetail] = {}
        for ident in wanted:
            try:
                shown[ident] = details.get(
                    (project, ident), partial(show_milestone, run, cwd, ident, None)
                )
            except MilestonesError as exc:
                warnings.append(f"gin milestone show {ident} failed: {exc}")
        warning = None
        if warnings:
            warning = (
                "; ".join(warnings) + ". Planned dates, forecast end, and epic estimates are blank."
            )
        generated_at = clock()
        doc = build_wbs(
            project,
            snapshot,
            listing,
            shown,
            milestone_id=milestone,
            generated_at=generated_at,
            warning=warning,
        )
        stem = f"{project}-{milestone}-wbs" if milestone else f"{project}-wbs"
        name = f"{stem}-{generated_at.date().isoformat()}.{format}"
        headers = {"Content-Disposition": attachment(name)}
        if warning:
            headers["X-WBS-Warning"] = header_safe(warning)
        if format == "xlsx":
            return Response(to_xlsx(doc), media_type=XLSX_TYPE, headers=headers)
        if format == "csv":
            return Response(to_csv(doc), media_type="text/csv; charset=utf-8", headers=headers)
        return Response(
            to_markdown(doc), media_type="text/markdown; charset=utf-8", headers=headers
        )

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
