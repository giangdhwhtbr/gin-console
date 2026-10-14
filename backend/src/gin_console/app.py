"""HTTP app: /api/* routes plus the built frontend with SPA fallback."""

from importlib.metadata import version
from pathlib import Path

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse, Response

from gin_console.config import Settings
from gin_console.projects.router import build_router as build_projects_router
from gin_console.sessions.router import build_router as build_sessions_router

# backend/src/gin_console/app.py -> repository root is parents[3]
_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"]
DEFAULT_STATIC_DIR = Path(__file__).resolve().parents[3] / "frontend" / "dist"
DEFAULT_CLAUDE_HOME = Path.home() / ".claude"


def create_app(
    settings: Settings,
    static_dir: Path = DEFAULT_STATIC_DIR,
    claude_home: Path = DEFAULT_CLAUDE_HOME,
) -> FastAPI:
    app = FastAPI(title="gin-console", docs_url=None, redoc_url=None, openapi_url=None)

    api = APIRouter(prefix="/api")

    @api.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "version": version("gin-console")}

    api.include_router(build_projects_router(settings))
    api.include_router(build_sessions_router(settings, claude_home))

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
