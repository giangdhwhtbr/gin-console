# Plan: Foundation

Epic: gin-console-rm-foundation
Spec: docs/changes/gin-console-rm-foundation-foundation/ (proposal.md, spec-delta.md, design.md, tests.md)
ADR: docs/adr/0001-single-process-modular-contexts.md

## Objective

A runnable FastAPI + React app on `127.0.0.1:8700` that loads the configured project list, shows it on a Projects page, runs as a systemd user service, and is reachable only through `tailscale serve` on `:8443`. Lint, typecheck, test, and build run in git hooks.

## Goal, Architecture, Tech Stack (from the spec)

- Goal: gin-console needs a runnable base before any monitoring screen can exist: a FastAPI + React app that knows which projects to show and is reachable only from the tailnet.
- Architecture: one process, one port. FastAPI serves `/api/*` and the built frontend on `127.0.0.1:8700`; `tailscale serve` exposes it on HTTPS `:8443`. Code is organized by bounded context, one context per roadmap epic. Unstable data sources sit behind one `source.py` module per context that returns the console's own pydantic models. No shared interfaces or base classes until a second implementation exists.
- Tech stack: Python 3.12, uv, FastAPI, uvicorn, pydantic v2, PyYAML, pytest, ruff, mypy; Vite, React, TypeScript, Tailwind CSS v4, shadcn/ui, pnpm, vitest, Testing Library, eslint.

## Global Constraints

- Single machine: the console, all projects, and all agents run on the same host; the console reads the filesystem directly.
- Only projects listed in the console's YAML config appear.
- Read-only: the console never mutates projects, Beads, or sessions.
- Access only via Tailscale (bind to `127.0.0.1` behind `tailscale serve`); no public exposure, no separate login.
- Non-goals: authentication; any data collector (gin-workflow state, Beads, sessions, quota); config hot reload; end-to-end tests.
- Automated tests carry the REQ-ID in the test name or a comment.

## Model Guidance
- `default_model_class`: `standard_impl`
- `phase_guidance`:
  - `brainstorm`: `high_reasoning`
  - `design`: `high_reasoning`
  - `plan`: `standard_impl`
  - `implement`: `standard_impl`
  - `review`: `high_reasoning`
  - `docs`: `cheap_simple`
- `override_rule`: Use `high_reasoning` for planning only when execution boundaries, dependency sequencing, or major tradeoffs are still unresolved.

## Requirement Analysis
- Problem statement: there is no application yet; every later epic needs a server, a config of projects, a UI shell, and a deployment path.
- Success criteria: all REQs in `spec-delta.md` have passing automated tests, except REQ-DEPLOY-001 and REQ-DEPLOY-002 which pass the manual cases in `tests.md`; `verify.checks` pass and run in git hooks; the Projects page loads from another tailnet device at `:8443`.
- Constraints: see Global Constraints.
- Non-goals: see Global Constraints.

## Approach Options
### Option 1: One process, one port (selected in discuss)
- Summary: FastAPI serves the API and `frontend/dist`.
- Pros: one systemd unit, one serve rule.
- Cons: frontend changes need a build and a service restart.

### Option 2: Reverse proxy with two processes
- Summary: Caddy serves static files, uvicorn serves the API.
- Pros: clean separation.
- Cons: an extra service with no benefit for one user.

### Recommended Approach
- Selected option: Option 1.
- Reasoning: confirmed in discuss and recorded in ADR 0001.

## Scope
- In scope: REQ-CONFIG-001..003, REQ-SERVER-001..004, REQ-UI-001..002, REQ-DEPLOY-001..002, verify commands and git hooks.
- Out of scope: everything listed under non-goals.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: Four tracks, single provider mode, and Track 4 depends on all others; one agent working in order is simplest.
```

## File Map

| File | Responsibility | Track |
|---|---|---|
| `.gitignore` (modify) | ignore venv, caches, node_modules, dist | 1, 3 |
| `backend/pyproject.toml` | Python project, deps, ruff/mypy/pytest config | 1 |
| `backend/src/gin_console/__init__.py` | package marker | 1 |
| `backend/src/gin_console/config.py` | config path resolution, schema, loading, bind guard | 1 |
| `backend/tests/test_config.py` | config + bind guard tests | 1 |
| `backend/src/gin_console/projects/__init__.py` | package marker | 2 |
| `backend/src/gin_console/projects/models.py` | `Project` response model | 2 |
| `backend/src/gin_console/projects/source.py` | `list_projects(settings)` | 2 |
| `backend/src/gin_console/projects/router.py` | `GET /api/projects` | 2 |
| `backend/src/gin_console/app.py` | `create_app`: health, routers, API 404, SPA/static | 2 |
| `backend/src/gin_console/__main__.py` | entry point: load, guard, run uvicorn | 2 |
| `backend/tests/test_app.py` | API + static tests | 2 |
| `backend/tests/test_main.py` | startup failure tests | 2 |
| `frontend/**` | Vite app, shell, Projects feature | 3 |
| `config.example.yaml` | sample config | 4 |
| `deploy/gin-console.service` | systemd user unit | 4 |
| `deploy/README.md` | install, Tailscale, verification commands | 4 |
| `.agent-workflow/config.yaml` (via CLI) | `verify.checks` | 4 |

## Tasks

### Track 1: Backend config and bind guard
- **Dependencies**: none
- **Requirements**: REQ-CONFIG-001, REQ-CONFIG-002, REQ-CONFIG-003, REQ-SERVER-001
- **Files**: create `backend/pyproject.toml`, `backend/src/gin_console/__init__.py`, `backend/src/gin_console/config.py`, `backend/tests/test_config.py`; modify `.gitignore`
- **Provider role**: `backend`
- **Reasoning**: `medium`
- **Model class**: `standard_impl`
- **Acceptance criteria**: every scenario of the four REQs has a passing test; `uv --directory backend run ruff check .` and `uv --directory backend run mypy` are clean.
- **Estimated complexity**: low

**Interfaces produced**
```python
# gin_console.config
CONFIG_ENV: str = "GIN_CONSOLE_CONFIG"
ALLOW_NON_LOOPBACK_ENV: str = "GIN_CONSOLE_ALLOW_NON_LOOPBACK"
class ConfigError(Exception): ...
class ServerSettings(BaseModel): host: str = "127.0.0.1"; port: int = 8700
class ProjectEntry(BaseModel): name: str; path: Path; scotty_id: str | None = None
class Settings(BaseModel): server: ServerSettings; projects: list[ProjectEntry]
def default_config_path() -> Path
def resolve_config_path(env: Mapping[str, str]) -> Path
def load_settings(path: Path) -> Settings          # raises ConfigError
def check_bind_host(host: str, env: Mapping[str, str]) -> None   # raises ConfigError
```

**Steps**

1. Install uv once (not present on the host): `curl -LsSf https://astral.sh/uv/install.sh | sh`, then `uv --version` prints a version.
2. Append to `.gitignore`:
   ```gitignore
   # Python
   backend/.venv/
   __pycache__/
   .mypy_cache/
   .ruff_cache/
   .pytest_cache/
   ```
3. Create `backend/pyproject.toml`:
   ```toml
   [project]
   name = "gin-console"
   version = "0.1.0"
   description = "Console for gin-workflow projects"
   requires-python = ">=3.12"
   dependencies = [
       "fastapi>=0.115",
       "uvicorn>=0.30",
       "pydantic>=2.8",
       "pyyaml>=6.0",
   ]

   [dependency-groups]
   dev = [
       "pytest>=8.3",
       "httpx>=0.27",
       "ruff>=0.6",
       "mypy>=1.11",
       "types-PyYAML>=6.0",
   ]

   [build-system]
   requires = ["hatchling"]
   build-backend = "hatchling.build"

   [tool.hatch.build.targets.wheel]
   packages = ["src/gin_console"]

   [tool.ruff]
   line-length = 100

   [tool.ruff.lint]
   select = ["E", "F", "I", "B", "UP", "BLE"]

   [tool.mypy]
   strict = true
   files = ["src", "tests"]

   [tool.pytest.ini_options]
   testpaths = ["tests"]
   ```
   Create empty `backend/src/gin_console/__init__.py`. Run `uv --directory backend sync`; expect `backend/uv.lock` and `backend/.venv/` to be created.
4. Write the failing tests `backend/tests/test_config.py`:
   ```python
   from pathlib import Path

   import pytest

   from gin_console.config import (
       ALLOW_NON_LOOPBACK_ENV,
       CONFIG_ENV,
       ConfigError,
       check_bind_host,
       load_settings,
       resolve_config_path,
   )


   def write(tmp_path: Path, text: str) -> Path:
       path = tmp_path / "config.yaml"
       path.write_text(text)
       return path


   # REQ-CONFIG-001
   def test_config_001_default_location(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
       monkeypatch.setenv("HOME", str(tmp_path))
       assert resolve_config_path({}) == tmp_path / ".config/gin-console/config.yaml"


   # REQ-CONFIG-001
   def test_config_001_env_override(tmp_path: Path) -> None:
       other = tmp_path / "other.yaml"
       assert resolve_config_path({CONFIG_ENV: str(other)}) == other


   # REQ-CONFIG-002
   def test_config_002_valid_projects_in_order(tmp_path: Path) -> None:
       path = write(
           tmp_path,
           "projects:\n"
           "  - {name: qwikfone, path: /home/gin/qwikfone, scotty_id: qwikfone}\n"
           "  - {name: scotty, path: /home/gin/scotty}\n",
       )
       settings = load_settings(path)
       assert [p.name for p in settings.projects] == ["qwikfone", "scotty"]
       assert settings.projects[0].scotty_id == "qwikfone"
       assert settings.projects[1].scotty_id is None


   # REQ-CONFIG-002
   def test_config_002_server_defaults(tmp_path: Path) -> None:
       settings = load_settings(write(tmp_path, "projects: []\n"))
       assert (settings.server.host, settings.server.port) == ("127.0.0.1", 8700)


   # REQ-CONFIG-003
   def test_config_003_missing_file(tmp_path: Path) -> None:
       missing = tmp_path / "nope.yaml"
       with pytest.raises(ConfigError, match="config.example.yaml") as exc:
           load_settings(missing)
       assert str(missing) in str(exc.value)


   # REQ-CONFIG-003
   def test_config_003_invalid_yaml(tmp_path: Path) -> None:
       with pytest.raises(ConfigError, match="invalid YAML"):
           load_settings(write(tmp_path, "projects: [\n"))


   # REQ-CONFIG-003
   def test_config_003_duplicate_name(tmp_path: Path) -> None:
       path = write(
           tmp_path,
           "projects:\n"
           "  - {name: qwikfone, path: /a}\n"
           "  - {name: qwikfone, path: /b}\n",
       )
       with pytest.raises(ConfigError, match="duplicate project name: qwikfone"):
           load_settings(path)


   # REQ-CONFIG-003
   def test_config_003_relative_path(tmp_path: Path) -> None:
       path = write(tmp_path, "projects:\n  - {name: qwikfone, path: qwikfone}\n")
       with pytest.raises(ConfigError, match=r"projects\.0\.path"):
           load_settings(path)


   # REQ-CONFIG-003
   def test_config_003_unknown_field(tmp_path: Path) -> None:
       with pytest.raises(ConfigError, match="colour"):
           load_settings(write(tmp_path, "colour: blue\n"))


   # REQ-SERVER-001
   @pytest.mark.parametrize("host", ["127.0.0.1", "::1", "localhost"])
   def test_server_001_loopback_allowed(host: str) -> None:
       check_bind_host(host, {})


   # REQ-SERVER-001
   @pytest.mark.parametrize("host", ["0.0.0.0", "100.114.99.13", "example.com"])
   def test_server_001_non_loopback_refused(host: str) -> None:
       with pytest.raises(ConfigError, match="tailscale serve"):
           check_bind_host(host, {})


   # REQ-SERVER-001
   def test_server_001_override_allows() -> None:
       check_bind_host("0.0.0.0", {ALLOW_NON_LOOPBACK_ENV: "1"})
   ```
   Run `uv --directory backend run pytest`; expect an `ImportError` collecting `test_config.py`.
5. Create `backend/src/gin_console/config.py`:
   ```python
   """Console configuration: where it lives, what it contains, and where we may bind."""

   from __future__ import annotations

   import ipaddress
   from collections.abc import Mapping
   from pathlib import Path

   import yaml
   from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator

   CONFIG_ENV = "GIN_CONSOLE_CONFIG"
   ALLOW_NON_LOOPBACK_ENV = "GIN_CONSOLE_ALLOW_NON_LOOPBACK"


   class ConfigError(Exception):
       """Startup configuration problem; the message is shown to the operator."""


   class ServerSettings(BaseModel):
       model_config = ConfigDict(extra="forbid")

       host: str = "127.0.0.1"
       port: int = Field(default=8700, ge=1, le=65535)


   class ProjectEntry(BaseModel):
       model_config = ConfigDict(extra="forbid")

       name: str = Field(min_length=1)
       path: Path
       scotty_id: str | None = None

       @field_validator("path")
       @classmethod
       def _absolute(cls, value: Path) -> Path:
           if not value.is_absolute():
               raise ValueError("must be an absolute path")
           return value


   class Settings(BaseModel):
       model_config = ConfigDict(extra="forbid")

       server: ServerSettings = Field(default_factory=ServerSettings)
       projects: list[ProjectEntry] = Field(default_factory=list)

       @model_validator(mode="after")
       def _unique_names(self) -> Settings:
           seen: set[str] = set()
           for project in self.projects:
               if project.name in seen:
                   raise ValueError(f"duplicate project name: {project.name}")
               seen.add(project.name)
           return self


   def default_config_path() -> Path:
       return Path.home() / ".config" / "gin-console" / "config.yaml"


   def resolve_config_path(env: Mapping[str, str]) -> Path:
       raw = env.get(CONFIG_ENV)
       return Path(raw).expanduser() if raw else default_config_path()


   def load_settings(path: Path) -> Settings:
       if not path.is_file():
           raise ConfigError(
               f"config file not found: {path}\n"
               f"copy config.example.yaml to {path} and edit it, or set {CONFIG_ENV}"
           )
       try:
           data = yaml.safe_load(path.read_text()) or {}
       except yaml.YAMLError as exc:
           raise ConfigError(f"{path}: invalid YAML: {exc}") from exc
       try:
           return Settings.model_validate(data)
       except ValidationError as exc:
           raise ConfigError(f"{path}: invalid config:\n{exc}") from exc


   def check_bind_host(host: str, env: Mapping[str, str]) -> None:
       try:
           loopback = ipaddress.ip_address(host).is_loopback
       except ValueError:
           loopback = host == "localhost"
       if not loopback and env.get(ALLOW_NON_LOOPBACK_ENV) != "1":
           raise ConfigError(
               f"refusing to bind {host}: gin-console must listen on loopback behind "
               f"`tailscale serve` (set {ALLOW_NON_LOOPBACK_ENV}=1 to override)"
           )
   ```
   Note: pydantic reports the duplicate-name error from the model validator as `Value error, duplicate project name: qwikfone`, which the test regex matches; the relative-path error location prints as `projects.0.path`.
6. Run `uv --directory backend run pytest`; expect all tests in `test_config.py` to pass. Run `uv --directory backend run ruff check .` and `uv --directory backend run mypy`; expect no findings.
7. Commit on the track branch: `feat(backend): add config loading and bind guard`.

### Track 2: Backend app, projects API, static serving, entry point
- **Dependencies**: Track 1
- **Requirements**: REQ-SERVER-001, REQ-SERVER-002, REQ-SERVER-003, REQ-SERVER-004
- **Files**: create `backend/src/gin_console/projects/__init__.py`, `projects/models.py`, `projects/source.py`, `projects/router.py`, `backend/src/gin_console/app.py`, `backend/src/gin_console/__main__.py`, `backend/tests/test_app.py`, `backend/tests/test_main.py`
- **Provider role**: `backend`
- **Reasoning**: `medium`
- **Model class**: `standard_impl`
- **Acceptance criteria**: every scenario of REQ-SERVER-002..004 has a passing test; startup with a bad config or non-loopback host exits 1 (REQ-SERVER-001 end to end); ruff and mypy clean.
- **Estimated complexity**: medium

**Interfaces consumed**: `Settings`, `ConfigError`, `load_settings`, `resolve_config_path`, `check_bind_host` from Track 1.

**Interfaces produced**
```python
# gin_console.projects.models
class Project(BaseModel): name: str; path: str; scotty_id: str | None; exists: bool
# gin_console.projects.source
def list_projects(settings: Settings) -> list[Project]
# gin_console.projects.router
def build_router(settings: Settings) -> APIRouter          # GET /projects (mounted under /api)
# gin_console.app
DEFAULT_STATIC_DIR: Path                                   # <repo>/frontend/dist
def create_app(settings: Settings, static_dir: Path = DEFAULT_STATIC_DIR) -> FastAPI
# gin_console.__main__
def main() -> int
```
HTTP contract consumed by Track 3:
- `GET /api/health` → `200 {"status": "ok", "version": "0.1.0"}`
- `GET /api/projects` → `200 [{"name": str, "path": str, "scotty_id": str | null, "exists": bool}, ...]`

**Steps**

1. Write the failing tests `backend/tests/test_app.py`:
   ```python
   from pathlib import Path

   import pytest
   from fastapi.testclient import TestClient

   from gin_console.app import create_app
   from gin_console.config import ProjectEntry, Settings


   def make_client(tmp_path: Path, projects: list[ProjectEntry], built: bool = True) -> TestClient:
       static = tmp_path / "dist"
       static.mkdir()
       if built:
           (static / "index.html").write_text("<html>console</html>")
           (static / "app.js").write_text("console.log(1)")
       return TestClient(create_app(Settings(projects=projects), static_dir=static))


   # REQ-SERVER-002
   def test_server_002_health(tmp_path: Path) -> None:
       response = make_client(tmp_path, []).get("/api/health")
       assert response.status_code == 200
       assert response.json() == {"status": "ok", "version": "0.1.0"}


   # REQ-SERVER-003
   def test_server_003_projects_exists_flags(tmp_path: Path) -> None:
       present = tmp_path / "present"
       present.mkdir()
       client = make_client(
           tmp_path,
           [
               ProjectEntry(name="present", path=present, scotty_id="p"),
               ProjectEntry(name="absent", path=tmp_path / "absent"),
           ],
       )
       assert client.get("/api/projects").json() == [
           {"name": "present", "path": str(present), "scotty_id": "p", "exists": True},
           {"name": "absent", "path": str(tmp_path / "absent"), "scotty_id": None, "exists": False},
       ]


   # REQ-SERVER-003
   def test_server_003_path_appears_later(tmp_path: Path) -> None:
       later = tmp_path / "later"
       client = make_client(tmp_path, [ProjectEntry(name="later", path=later)])
       assert client.get("/api/projects").json()[0]["exists"] is False
       later.mkdir()
       assert client.get("/api/projects").json()[0]["exists"] is True


   # REQ-SERVER-004
   @pytest.mark.parametrize("path", ["/", "/projects", "/projects/qwikfone"])
   def test_server_004_spa_fallback(tmp_path: Path, path: str) -> None:
       response = make_client(tmp_path, []).get(path)
       assert response.status_code == 200
       assert response.text == "<html>console</html>"


   # REQ-SERVER-004
   def test_server_004_static_asset(tmp_path: Path) -> None:
       response = make_client(tmp_path, []).get("/app.js")
       assert response.text == "console.log(1)"


   # REQ-SERVER-004
   def test_server_004_unknown_api_is_404(tmp_path: Path) -> None:
       response = make_client(tmp_path, []).get("/api/unknown")
       assert response.status_code == 404
       assert "console" not in response.text


   # REQ-SERVER-004
   def test_server_004_not_built_is_503(tmp_path: Path) -> None:
       response = make_client(tmp_path, [], built=False).get("/")
       assert response.status_code == 503
       assert "pnpm -C frontend build" in response.text
   ```
   And `backend/tests/test_main.py`:
   ```python
   from pathlib import Path

   import pytest

   from gin_console.__main__ import main
   from gin_console.config import ALLOW_NON_LOOPBACK_ENV, CONFIG_ENV


   # REQ-CONFIG-003
   def test_main_missing_config_exits_1(
       monkeypatch: pytest.MonkeyPatch, tmp_path: Path, capsys: pytest.CaptureFixture[str]
   ) -> None:
       monkeypatch.setenv(CONFIG_ENV, str(tmp_path / "missing.yaml"))
       assert main() == 1
       assert "config file not found" in capsys.readouterr().err


   # REQ-SERVER-001
   def test_main_non_loopback_exits_1(
       monkeypatch: pytest.MonkeyPatch, tmp_path: Path, capsys: pytest.CaptureFixture[str]
   ) -> None:
       config = tmp_path / "config.yaml"
       config.write_text("server: {host: 0.0.0.0}\nprojects: []\n")
       monkeypatch.setenv(CONFIG_ENV, str(config))
       monkeypatch.delenv(ALLOW_NON_LOOPBACK_ENV, raising=False)
       assert main() == 1
       assert "tailscale serve" in capsys.readouterr().err
   ```
   Run `uv --directory backend run pytest`; expect import errors for `gin_console.app` and `gin_console.__main__`.
2. Create the projects context. Empty `backend/src/gin_console/projects/__init__.py`, then `projects/models.py`:
   ```python
   from pydantic import BaseModel


   class Project(BaseModel):
       name: str
       path: str
       scotty_id: str | None
       exists: bool
   ```
   `projects/source.py`:
   ```python
   """Projects come from the console config; existence is checked on every call."""

   from gin_console.config import Settings
   from gin_console.projects.models import Project


   def list_projects(settings: Settings) -> list[Project]:
       return [
           Project(name=p.name, path=str(p.path), scotty_id=p.scotty_id, exists=p.path.is_dir())
           for p in settings.projects
       ]
   ```
   `projects/router.py`:
   ```python
   from fastapi import APIRouter

   from gin_console.config import Settings
   from gin_console.projects.models import Project
   from gin_console.projects.source import list_projects


   def build_router(settings: Settings) -> APIRouter:
       router = APIRouter()

       @router.get("/projects")
       def get_projects() -> list[Project]:
           return list_projects(settings)

       return router
   ```
3. Create `backend/src/gin_console/app.py`:
   ```python
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
   ```
4. Create `backend/src/gin_console/__main__.py`:
   ```python
   import os
   import sys

   import uvicorn

   from gin_console.app import create_app
   from gin_console.config import ConfigError, check_bind_host, load_settings, resolve_config_path


   def main() -> int:
       try:
           settings = load_settings(resolve_config_path(os.environ))
           check_bind_host(settings.server.host, os.environ)
       except ConfigError as exc:
           print(f"gin-console: {exc}", file=sys.stderr)
           return 1
       uvicorn.run(create_app(settings), host=settings.server.host, port=settings.server.port)
       return 0


   if __name__ == "__main__":
       sys.exit(main())
   ```
5. Run `uv --directory backend run pytest`; expect all backend tests to pass. Run ruff and mypy; expect no findings.
6. Smoke check: create `/tmp/gc.yaml` with `projects: [{name: gin-console, path: /home/gin/gin-console}]`, run `GIN_CONSOLE_CONFIG=/tmp/gc.yaml uv --directory backend run python -m gin_console` in the background, then `curl -s 127.0.0.1:8700/api/projects` prints the project with `"exists":true` and `curl -s -o /dev/null -w '%{http_code}' 127.0.0.1:8700/` prints `503`. Stop the server.
7. Commit: `feat(backend): add projects API, static serving, and entry point`.

### Track 3: Frontend shell and Projects page
- **Dependencies**: none (consumes only the HTTP contract from Track 2; may start in parallel)
- **Requirements**: REQ-UI-001, REQ-UI-002
- **Files**: create `frontend/` (Vite scaffold), `frontend/src/app/App.tsx`, `frontend/src/app/Layout.tsx`, `frontend/src/features/projects/api.ts`, `frontend/src/features/projects/ProjectsPage.tsx`, `frontend/src/features/projects/ProjectsPage.test.tsx`, `frontend/src/test/setup.ts`; modify `frontend/src/main.tsx`, `frontend/vite.config.ts`, `frontend/eslint.config.js`, `frontend/package.json`, `frontend/tsconfig.json`, `frontend/tsconfig.app.json`, `.gitignore`
- **Provider role**: `frontend`
- **Reasoning**: `medium`
- **Model class**: `standard_impl`
- **Acceptance criteria**: every scenario of REQ-UI-001 and REQ-UI-002 has a passing vitest test; `pnpm -C frontend lint`, `pnpm -C frontend typecheck`, and `pnpm -C frontend build` succeed and `frontend/dist/index.html` exists.
- **Estimated complexity**: medium

**Interfaces consumed**: `GET /api/projects` contract from Track 2.

**Interfaces produced**
```ts
// frontend/src/features/projects/api.ts
export type Project = { name: string; path: string; scotty_id: string | null; exists: boolean };
export function fetchProjects(): Promise<Project[]>;
// frontend/src/features/projects/ProjectsPage.tsx
export function ProjectsPage(): JSX.Element;
// frontend/src/app/Layout.tsx
export function Layout(props: { children: React.ReactNode }): JSX.Element;
```

**Steps**

1. Scaffold: `pnpm create vite frontend --template react-ts`, then `pnpm -C frontend install`. Append to `.gitignore`:
   ```gitignore
   # Frontend
   frontend/node_modules/
   frontend/dist/
   ```
   Delete the template demo files `frontend/src/App.tsx`, `frontend/src/App.css`, and `frontend/src/assets/`.
2. Tailwind v4: `pnpm -C frontend add tailwindcss @tailwindcss/vite`. Replace `frontend/src/index.css` with `@import "tailwindcss";`.
3. Path alias for shadcn. In both `frontend/tsconfig.json` and `frontend/tsconfig.app.json` add under `compilerOptions`: `"baseUrl": ".", "paths": { "@/*": ["./src/*"] }` (the root `tsconfig.json` gets a `compilerOptions` object if it has none). `pnpm -C frontend add -D @types/node`.
4. Replace `frontend/vite.config.ts`:
   ```ts
   /// <reference types="vitest/config" />
   import path from "node:path";
   import tailwindcss from "@tailwindcss/vite";
   import react from "@vitejs/plugin-react";
   import { defineConfig } from "vite";

   export default defineConfig({
     plugins: [react(), tailwindcss()],
     resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
     server: { proxy: { "/api": "http://127.0.0.1:8700" } },
     test: { environment: "jsdom", setupFiles: ["./src/test/setup.ts"] },
   });
   ```
5. shadcn: `cd frontend && pnpm dlx shadcn@latest init --defaults --yes` (accept defaults if any prompt remains), then `pnpm dlx shadcn@latest add table badge button alert --yes`. Expect `frontend/components.json`, `frontend/src/lib/utils.ts`, and `frontend/src/components/ui/{table,badge,button,alert}.tsx`.
6. Test tooling: `pnpm -C frontend add -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`. Create `frontend/src/test/setup.ts`:
   ```ts
   import "@testing-library/jest-dom/vitest";
   ```
   In `frontend/package.json` `scripts` set:
   ```json
   "dev": "vite",
   "build": "tsc -b && vite build",
   "lint": "eslint .",
   "typecheck": "tsc -b",
   "test": "vitest",
   "preview": "vite preview"
   ```
   Tests import `describe`, `it`, `expect`, and `vi` from `vitest` explicitly, so no global test types are configured.
7. Strict lint: in `frontend/eslint.config.js` replace `tseslint.configs.recommended` with `tseslint.configs.recommendedTypeChecked`, keep `reactHooks.configs["recommended-latest"]` (use the template's existing react-hooks entry if it is named differently), and add to `languageOptions`: `parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname }`. Add `"dist"` and `"src/components/ui"` to the ignores (generated shadcn code). Confirm `strict: true` is set in `tsconfig.app.json` (template default).
8. Write the failing test `frontend/src/features/projects/ProjectsPage.test.tsx`:
   ```tsx
   import { render, screen, within } from "@testing-library/react";
   import userEvent from "@testing-library/user-event";
   import { afterEach, describe, expect, it, vi } from "vitest";
   import { ProjectsPage } from "./ProjectsPage";

   const json = (body: unknown, status = 200) =>
     new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

   afterEach(() => vi.unstubAllGlobals());

   describe("ProjectsPage", () => {
     // REQ-UI-001
     it("REQ-UI-001 lists projects and marks missing ones", async () => {
       vi.stubGlobal(
         "fetch",
         vi.fn().mockResolvedValue(
           json([
             { name: "qwikfone", path: "/home/gin/qwikfone", scotty_id: "qwikfone", exists: true },
             { name: "old", path: "/home/gin/old", scotty_id: null, exists: false },
           ]),
         ),
       );
       render(<ProjectsPage />);
       const present = (await screen.findByText("qwikfone")).closest("tr")!;
       const missing = screen.getByText("old").closest("tr")!;
       expect(within(present).getByText("/home/gin/qwikfone")).toBeInTheDocument();
       expect(within(present).queryByText("missing")).not.toBeInTheDocument();
       expect(within(missing).getByText("missing")).toBeInTheDocument();
     });

     // REQ-UI-001
     it("REQ-UI-001 shows an empty state naming the config file", async () => {
       vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json([])));
       render(<ProjectsPage />);
       expect(await screen.findByText(/no projects configured/i)).toBeInTheDocument();
       expect(screen.getByText(/~\/\.config\/gin-console\/config\.yaml/)).toBeInTheDocument();
     });

     // REQ-UI-002
     it("REQ-UI-002 shows an error and retries", async () => {
       const fetchMock = vi
         .fn()
         .mockResolvedValueOnce(json({ detail: "boom" }, 500))
         .mockResolvedValueOnce(
           json([{ name: "scotty", path: "/home/gin/scotty", scotty_id: null, exists: true }]),
         );
       vi.stubGlobal("fetch", fetchMock);
       render(<ProjectsPage />);
       expect(await screen.findByRole("alert")).toHaveTextContent(/500/);
       await userEvent.click(screen.getByRole("button", { name: /retry/i }));
       expect(await screen.findByText("scotty")).toBeInTheDocument();
       expect(screen.queryByRole("alert")).not.toBeInTheDocument();
       expect(fetchMock).toHaveBeenCalledTimes(2);
     });
   });
   ```
   Run `pnpm -C frontend test --run`; expect failure resolving `./ProjectsPage`.
9. Create `frontend/src/features/projects/api.ts`:
   ```ts
   export type Project = {
     name: string;
     path: string;
     scotty_id: string | null;
     exists: boolean;
   };

   export async function fetchProjects(): Promise<Project[]> {
     const response = await fetch("/api/projects");
     if (!response.ok) {
       throw new Error(`Could not load projects (HTTP ${response.status})`);
     }
     return (await response.json()) as Project[];
   }
   ```
   Create `frontend/src/features/projects/ProjectsPage.tsx`:
   ```tsx
   import { useCallback, useEffect, useState } from "react";
   import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
   import { Badge } from "@/components/ui/badge";
   import { Button } from "@/components/ui/button";
   import {
     Table,
     TableBody,
     TableCell,
     TableHead,
     TableHeader,
     TableRow,
   } from "@/components/ui/table";
   import { fetchProjects, type Project } from "./api";

   type State =
     | { status: "loading" }
     | { status: "error"; message: string }
     | { status: "ok"; projects: Project[] };

   export function ProjectsPage() {
     const [state, setState] = useState<State>({ status: "loading" });

     // setState only runs in promise callbacks, so calling load() from the effect is safe.
     // Both outcomes are handled; `void` tells no-floating-promises the result is intentionally unused.
     const load = useCallback(() => {
       void fetchProjects().then(
         (projects) => setState({ status: "ok", projects }),
         (error: unknown) =>
           setState({ status: "error", message: error instanceof Error ? error.message : String(error) }),
       );
     }, []);

     useEffect(() => {
       load();
     }, [load]);

     const retry = () => {
       setState({ status: "loading" });
       load();
     };

     return (
       <section className="flex flex-col gap-4">
         <h1 className="text-xl font-semibold">Projects</h1>
         {state.status === "loading" && <p className="text-muted-foreground">Loading projects…</p>}
         {state.status === "error" && (
           <Alert variant="destructive" role="alert">
             <AlertTitle>Projects could not be loaded</AlertTitle>
             <AlertDescription className="flex flex-col items-start gap-2">
               <span>{state.message}</span>
               <Button variant="outline" size="sm" onClick={retry}>
                 Retry
               </Button>
             </AlertDescription>
           </Alert>
         )}
         {state.status === "ok" && state.projects.length === 0 && (
           <p className="text-muted-foreground">
             No projects configured. Add them to <code>~/.config/gin-console/config.yaml</code> (or
             the file in <code>GIN_CONSOLE_CONFIG</code>) and restart the console.
           </p>
         )}
         {state.status === "ok" && state.projects.length > 0 && (
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Name</TableHead>
                 <TableHead>Path</TableHead>
                 <TableHead>Status</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {state.projects.map((project) => (
                 <TableRow key={project.name}>
                   <TableCell className="font-medium">{project.name}</TableCell>
                   <TableCell className="font-mono text-sm">{project.path}</TableCell>
                   <TableCell>
                     {!project.exists && <Badge variant="destructive">missing</Badge>}
                   </TableCell>
                 </TableRow>
               ))}
             </TableBody>
           </Table>
         )}
       </section>
     );
   }
   ```
   If the generated shadcn `Alert` already sets `role="alert"`, drop the explicit prop.
10. Create `frontend/src/app/Layout.tsx`:
    ```tsx
    import type { ReactNode } from "react";

    export function Layout({ children }: { children: ReactNode }) {
      return (
        <div className="flex min-h-screen bg-background text-foreground">
          <aside className="w-52 shrink-0 border-r p-4">
            <div className="mb-6 font-semibold">gin-console</div>
            <nav className="flex flex-col gap-1 text-sm">
              <a href="/" className="rounded px-2 py-1 bg-muted font-medium">
                Projects
              </a>
            </nav>
          </aside>
          <main className="min-w-0 flex-1 p-6">{children}</main>
        </div>
      );
    }
    ```
    Create `frontend/src/app/App.tsx`:
    ```tsx
    import { ProjectsPage } from "@/features/projects/ProjectsPage";
    import { Layout } from "./Layout";

    export function App() {
      return (
        <Layout>
          <ProjectsPage />
        </Layout>
      );
    }
    ```
    In `frontend/src/main.tsx` import `{ App } from "./app/App"` instead of the template's default `App` import, keeping `import "./index.css"`.
11. Run `pnpm -C frontend test --run` (3 tests pass), `pnpm -C frontend lint`, `pnpm -C frontend typecheck`, `pnpm -C frontend build` (creates `frontend/dist/index.html`).
12. Commit: `feat(frontend): add app shell and Projects page`.

### Track 4: Deployment, verify checks, and git hooks
- **Dependencies**: Track 2, Track 3
- **Requirements**: REQ-DEPLOY-001, REQ-DEPLOY-002
- **Files**: create `config.example.yaml`, `deploy/gin-console.service`, `deploy/README.md`; modify `.agent-workflow/config.yaml` and its generated files through `gin-workflow setup configure`
- **Provider role**: `backend`
- **Reasoning**: `medium`
- **Model class**: `standard_impl`
- **Acceptance criteria**: `verify.checks` lint/typecheck/test/build pass from the repo root; git hooks installed; manual cases TC-1..TC-4 in `tests.md` pass and their output is recorded as evidence.
- **Estimated complexity**: low

**Interfaces consumed**: `python -m gin_console` (Track 2), `frontend/dist` (Track 3).

**Steps**

1. Create `config.example.yaml`:
   ```yaml
   # Copy to ~/.config/gin-console/config.yaml (or point GIN_CONSOLE_CONFIG at it).
   server:
     host: 127.0.0.1   # loopback only; exposed through `tailscale serve`
     port: 8700
   projects:
     - name: qwikfone
       path: /home/gin/qwikfone
     - name: scotty
       path: /home/gin/scotty
       scotty_id: scotty
     - name: gin-workflow
       path: /home/gin/gin-workflow
   ```
2. Create `deploy/gin-console.service`:
   ```ini
   [Unit]
   Description=gin-console
   After=network-online.target
   StartLimitIntervalSec=60
   StartLimitBurst=3

   [Service]
   WorkingDirectory=%h/gin-console
   ExecStart=%h/.local/bin/uv --directory %h/gin-console/backend run --frozen python -m gin_console
   Restart=on-failure
   RestartSec=5

   [Install]
   WantedBy=default.target
   ```
3. Create `deploy/README.md` with exactly these sections and commands:
   - Install: `cp config.example.yaml ~/.config/gin-console/config.yaml` (after `mkdir -p ~/.config/gin-console`), `pnpm -C frontend build`, `cp deploy/gin-console.service ~/.config/systemd/user/`, `systemctl --user daemon-reload`, `systemctl --user enable --now gin-console`, `sudo loginctl enable-linger gin`.
   - Update: `git pull`, `uv --directory backend sync --frozen`, `pnpm -C frontend install --frozen-lockfile && pnpm -C frontend build`, `systemctl --user restart gin-console`.
   - Tailscale: `tailscale serve --bg --https=8443 http://127.0.0.1:8700`; remove the redundant path with `tailscale serve --https=443 --set-path=/bd off`; check with `tailscale serve status`. Prefix with `sudo` if the user is not the Tailscale operator.
   - Logs: `journalctl --user -u gin-console -f`.
4. Configure verify checks (show the dry run to the user first, then apply):
   ```bash
   gin-workflow setup configure --dry-run \
     --set 'verify.checks.lint="uv --directory backend run ruff check . && pnpm -C frontend lint"' \
     --set 'verify.checks.typecheck="uv --directory backend run mypy && pnpm -C frontend typecheck"' \
     --set 'verify.checks.test="uv --directory backend run pytest && pnpm -C frontend test --run"' \
     --set 'verify.checks.build="pnpm -C frontend build"'
   ```
   then the same command with `--approve` instead of `--dry-run`. Run each of the four commands from the repo root; all exit 0.
5. `gin-workflow hooks install`. If it reports `occupied` or `missing` (beads already installed hooks under `.beads/hooks/`), follow the printed instruction; never overwrite a hook.
6. Deploy on the host following `deploy/README.md` (Install, then Tailscale), with the operator's approval before running `sudo` or changing `tailscale serve`.
7. Run manual cases from `tests.md` and keep their output as evidence:
   - TC-3: `tailscale serve status` shows `/` → `http://127.0.0.1:3000`, `:8443` → `http://127.0.0.1:8700`, no `/bd`.
   - TC-4: from another tailnet device, `https://instance-20260515-2304.tail5ca54e.ts.net:8443` shows the Projects page.
   - TC-2: temporarily set `GIN_CONSOLE_CONFIG` in a drop-in to a broken file, `systemctl --user restart gin-console`, wait 30 s, confirm `systemctl --user status gin-console` is `failed` and `journalctl --user -u gin-console` shows `gin-console: ... invalid config`; remove the drop-in and run `systemctl --user reset-failed gin-console && systemctl --user start gin-console`.
   - TC-1: after the next host reboot (operator schedules it), `systemctl --user status gin-console` is `active`.
8. Commit: `feat(deploy): add systemd unit, example config, and verify checks`.

## Requirement Coverage

| REQ | Track |
|---|---|
| REQ-CONFIG-001 | 1 |
| REQ-CONFIG-002 | 1 |
| REQ-CONFIG-003 | 1, 2 |
| REQ-SERVER-001 | 1, 2 |
| REQ-SERVER-002 | 2 |
| REQ-SERVER-003 | 2 |
| REQ-SERVER-004 | 2 |
| REQ-UI-001 | 3 |
| REQ-UI-002 | 3 |
| REQ-DEPLOY-001 | 4 |
| REQ-DEPLOY-002 | 4 |

## Beads

- Parent Bead: `gin-console-rm-foundation` (existing roadmap epic). It remains open until the human-confirmed merge.
- Track Beads: one per track, created by `orchestrate` with `--parent gin-console-rm-foundation --spec-id gin-console-rm-foundation-foundation --labels req:<REQ-ID>,…`. Each track bead closes when its tests and review pass, so dependents unblock.

## Integration
- **Branch**: `feat/gin-console-rm-foundation` (worktree per `project.worktree: parallel` only if Track 3 runs alongside Tracks 1–2)
- **Merge strategy**: sequential

## Validation
- [ ] `uv --directory backend run pytest && pnpm -C frontend test --run` pass
- [ ] `uv --directory backend run mypy && pnpm -C frontend typecheck` clean
- [ ] `uv --directory backend run ruff check . && pnpm -C frontend lint` clean
- [ ] `pnpm -C frontend build` succeeds
- [ ] `gin-workflow specs trace --change gin-console-rm-foundation` reports every REQ covered
- [ ] Manual cases TC-1..TC-4 pass

## Notes
- Model guidance is planning metadata, not Beads state.
- Provider roles and model classes are portable; concrete providers resolve from machine-local configuration during orchestration.
- Independent review (`project.review: independent`, max 2 cycles) runs per track before the track bead closes.
