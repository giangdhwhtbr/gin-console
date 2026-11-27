"""HTTP app: /api/* routes plus the built frontend with SPA fallback."""

import asyncio
import re
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from datetime import datetime
from importlib.metadata import version
from pathlib import Path

from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse, Response
from starlette.middleware.gzip import GZipMiddleware
from starlette.types import Scope

from gin_console.auth.access import COOKIE, AuthState, mockup_grant_of, projects_of
from gin_console.auth.router import build_router as build_auth_router
from gin_console.auth.sessions import Session
from gin_console.auth.users import User
from gin_console.beads.pull import BdRunner, PullScheduler, PullService, run_bd_pull
from gin_console.beads.router import build_router as build_beads_router
from gin_console.beads.snapshot import Reader, SnapshotStore
from gin_console.beads.source import read_export
from gin_console.clock import utc_now
from gin_console.config import Settings
from gin_console.milestones.router import build_router as build_milestones_router
from gin_console.milestones.source import GwRunner
from gin_console.milestones.source import run_gw as default_run_gw
from gin_console.overview.router import build_router as build_overview_router
from gin_console.projects.collect import collect_epic_workflow
from gin_console.projects.models import BlockError, EpicWorkflow
from gin_console.projects.router import build_router as build_projects_router
from gin_console.reports.interactions import InteractionStore
from gin_console.reports.router import build_router as build_reports_router
from gin_console.requirements.router import build_router as build_requirements_router
from gin_console.requirements.source import GinRunner
from gin_console.requirements.source import run_gin as default_run_gin

# backend/src/gin_console/app.py -> repository root is parents[3]
_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"]
DEFAULT_STATIC_DIR = Path(__file__).resolve().parents[3] / "frontend" / "dist"
_REFUSED_SITES = {"cross-site", "same-site"}
_MOCKUP_FILES = re.compile(r"/api/requirements/mockups/[^/]+/(?:g/[^/]+/)?files/")
# project, grant, capability and date of a mockup file requested by its folder grant
_GRANT_FILES = re.compile(r"/api/requirements/mockups/([^/]+)/g/([^/]+)/files/([^/]+)/([^/]+)/")
_NOT_FOUND = {"error": "not found"}
# the API a request without a session may call while auth is on (REQ-AUTH-005, REQ-AUTH-006)
_OPEN = {
    ("GET", "/api/health"),
    ("POST", "/api/auth/login"),
    ("GET", "/api/auth/me"),
    ("POST", "/api/auth/logout"),
}


def route_path(scope: Scope) -> str:
    """The decoded path the router matches: scope["path"] without the proxy's root_path.
    Not request.url.path, which is cut at a decoded "?" or "#"."""
    path: str = scope["path"]
    root: str = scope.get("root_path", "")
    if root and path.startswith(root + "/"):
        return path[len(root) :]
    return path


def refuses_cross_site(method: str, path: str, site: str | None) -> bool:
    """REQ-SERVER-012: a browser marks requests of other sites; only a mockup's GETs of its own
    files pass, with or without a grant. `path` is the decoded path the router matches, so the
    exception covers only the mockup file routes."""
    if site is None or site.lower() not in _REFUSED_SITES:
        return False
    if path != "/api" and not path.startswith("/api/"):
        return False
    return not (method == "GET" and _MOCKUP_FILES.match(path) is not None)


def create_app(
    settings: Settings,
    static_dir: Path = DEFAULT_STATIC_DIR,
    read_beads: Reader = read_export,
    run_gw: GwRunner = default_run_gw,
    run_gin: GinRunner = default_run_gin,
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
    auth = AuthState(settings, clock)
    projects = projects_of(settings)

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

    def signed_in(token: str | None) -> tuple[Session | None, User | None]:
        session = auth.session_of_token(token)
        return session, None if session is None else auth.users().get(session.name)

    # added after gzip and before the cross-site guard, so it runs between them (REQ-AUTH-005)
    @app.middleware("http")
    async def require_session(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        path = route_path(request.scope)
        grant = _GRANT_FILES.match(path) if request.method == "GET" else None
        if not auth.enabled:  # no grant is valid while auth is off (REQ-AUTH-016)
            if grant is not None:
                return JSONResponse(status_code=404, content=_NOT_FOUND)
            return await call_next(request)
        if path != "/api" and not path.startswith("/api/"):
            return await call_next(request)
        if grant is not None:  # a mockup's file: its folder grant, never the cookie (REQ-AUTH-016)
            project, token, capability, date = grant.groups()
            user = await run_in_threadpool(
                auth.user_of_folder_grant, token, project, capability, date
            )
            if user is None:
                return JSONResponse(status_code=404, content=_NOT_FOUND)
            request.state.grant = token
        else:
            session, user = await run_in_threadpool(signed_in, request.cookies.get(COOKIE))
            if user is None and (request.method, path) not in _OPEN:
                return JSONResponse(status_code=401, content={"error": "sign-in required"})
            request.state.session = session
        request.state.user = user
        return await call_next(request)

    # added last, so it runs first: a refusal never reaches the session check, gzip or a router
    @app.middleware("http")
    async def refuse_cross_site(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        site = request.headers.get("sec-fetch-site")
        if refuses_cross_site(request.method, route_path(request.scope), site):
            return JSONResponse(status_code=403, content={"error": "cross-site request refused"})
        return await call_next(request)

    api = APIRouter(prefix="/api")

    @api.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "version": version("gin-console")}

    @api.post("/refresh", status_code=204)
    def refresh(request: Request) -> None:
        """Pull every project the request may see (REQ-AUTH-008), then drop every cached answer
        so the next request reads its sources again; a failed pull is kept as that project's
        result, not raised."""
        pulls.pull_all([e.name for e in projects(request)] if auth.enabled else None)
        drop_caches()

    api.include_router(build_auth_router(settings, auth))
    api.include_router(build_projects_router(settings, snapshots, pulls, projects))
    api.include_router(build_overview_router(settings, snapshots, clock, projects))
    api.include_router(
        build_beads_router(settings, snapshots, clock, run_epic_workflow, on_refresh, projects)
    )
    api.include_router(
        build_milestones_router(settings, run_gw, clock, on_refresh, snapshots, projects)
    )
    api.include_router(
        build_requirements_router(
            settings, run_gin, clock, on_refresh, projects, mockup_grant_of(auth)
        )
    )
    api.include_router(
        build_reports_router(settings, snapshots, interactions, clock, on_refresh, projects)
    )

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
