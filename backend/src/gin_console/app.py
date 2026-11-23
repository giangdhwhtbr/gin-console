"""HTTP app: /api/* routes plus the built frontend with SPA fallback."""

import asyncio
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from datetime import datetime
from importlib.metadata import version
from pathlib import Path

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse, Response
from starlette.middleware.gzip import GZipMiddleware

from gin_console.beads.pull import BdRunner, PullScheduler, PullService, run_bd_pull
from gin_console.beads.router import build_router as build_beads_router
from gin_console.beads.snapshot import Reader, SnapshotStore
from gin_console.beads.source import read_export
from gin_console.clock import utc_now
from gin_console.config import Settings
from gin_console.milestones.router import build_router as build_milestones_router
from gin_console.milestones.source import GwRunner
from gin_console.milestones.source import run_gw as default_run_gw
from gin_console.projects.collect import collect_epic_workflow
from gin_console.projects.models import BlockError, EpicWorkflow
from gin_console.projects.router import build_router as build_projects_router
from gin_console.reports.interactions import InteractionStore
from gin_console.reports.router import build_router as build_reports_router

# backend/src/gin_console/app.py -> repository root is parents[3]
_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"]
DEFAULT_STATIC_DIR = Path(__file__).resolve().parents[3] / "frontend" / "dist"


def create_app(
    settings: Settings,
    static_dir: Path = DEFAULT_STATIC_DIR,
    read_beads: Reader = read_export,
    run_gw: GwRunner = default_run_gw,
    clock: Callable[[], datetime] = utc_now,
    run_bd: BdRunner = run_bd_pull,
    schedule_pulls: bool = True,
    run_epic_workflow: Callable[[Path, str], EpicWorkflow | BlockError] = collect_epic_workflow,
) -> FastAPI:
    # one read of .beads/issues.jsonl per project, reused until the file changes or a refresh
    snapshots = SnapshotStore(read_beads)
    interactions = InteractionStore()
    on_refresh: list[Callable[[], None]] = [snapshots.clear]
    # the only bd command the console runs (ADR 0003): on refresh and on schedule
    pulls = PullService(settings.projects, run_bd, clock)

    def drop_caches() -> None:
        for clear in on_refresh:
            clear()

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        interval = settings.beads.pull_interval
        if not (schedule_pulls and interval > 0):
            yield
            return
        scheduler = PullScheduler(pulls, interval, after=drop_caches)
        scheduler.start()
        try:
            yield
        finally:
            await asyncio.to_thread(scheduler.stop)  # waits for a running pull to end

    app = FastAPI(
        title="gin-console", docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan
    )
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    api = APIRouter(prefix="/api")

    @api.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "version": version("gin-console")}

    @api.post("/refresh", status_code=204)
    def refresh() -> None:
        """Pull every project, then drop every cached answer so the next request reads its
        sources again; a failed pull is kept as that project's result, not raised."""
        pulls.pull_all()
        drop_caches()

    api.include_router(build_projects_router(settings, snapshots, pulls))
    api.include_router(
        build_beads_router(settings, snapshots, clock, run_epic_workflow, on_refresh)
    )
    api.include_router(build_milestones_router(settings, run_gw, clock, on_refresh, snapshots))
    api.include_router(build_reports_router(settings, snapshots, interactions, clock, on_refresh))

    @api.api_route("/{rest:path}", methods=_METHODS)
    def api_not_found(rest: str) -> None:
        raise HTTPException(status_code=404)

    app.include_router(api)

    @app.api_route("/api", methods=_METHODS, include_in_schema=False)
    def api_root_not_found() -> None:
        raise HTTPException(status_code=404)

    root = static_dir.resolve()

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str) -> Response:
        index = root / "index.html"
        if not index.is_file():
            return PlainTextResponse(
                "frontend not built: run `pnpm -C frontend build`", status_code=503
            )
        try:
            candidate = (root / path).resolve()
        except ValueError:  # embedded NUL byte in the request path
            return FileResponse(index)
        if path and candidate.is_file() and candidate.is_relative_to(root):
            return FileResponse(candidate)
        return FileResponse(index)

    return app
