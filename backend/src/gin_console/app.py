"""HTTP app: /api/* routes plus the built frontend with SPA fallback."""

from importlib.metadata import version
from pathlib import Path

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse, Response

from gin_console.config import Settings
from gin_console.projects.router import build_router as build_projects_router

# backend/src/gin_console/app.py -> repository root is parents[3]
DEFAULT_STATIC_DIR = Path(__file__).resolve().parents[3] / "frontend" / "dist"


def create_app(settings: Settings, static_dir: Path = DEFAULT_STATIC_DIR) -> FastAPI:
    app = FastAPI(title="gin-console", docs_url=None, redoc_url=None, openapi_url=None)

    api = APIRouter(prefix="/api")

    @api.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "version": version("gin-console")}

    api.include_router(build_projects_router(settings))

    @api.api_route("/{rest:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
    def api_not_found(rest: str) -> None:
        raise HTTPException(status_code=404)

    app.include_router(api)

    root = static_dir.resolve()

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str) -> Response:
        index = root / "index.html"
        if not index.is_file():
            return PlainTextResponse(
                "frontend not built: run `pnpm -C frontend build`", status_code=503
            )
        candidate = (root / path).resolve()
        if path and candidate.is_file() and candidate.is_relative_to(root):
            return FileResponse(candidate)
        return FileResponse(index)

    return app
