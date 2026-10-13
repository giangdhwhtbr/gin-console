# Design: Foundation

Epic: gin-console-rm-foundation

## Architecture

One process, one port (see `docs/adr/0001-single-process-modular-contexts.md`). FastAPI serves `/api/*` and the built frontend on `127.0.0.1:8700`; `tailscale serve` exposes it on HTTPS `:8443`.

Code is organized by bounded context, one context per roadmap epic. Unstable data sources sit behind one `source.py` module per context that returns the console's own pydantic models. No shared interfaces or base classes until a second implementation exists.

```
backend/                      # uv project, Python 3.12
├── pyproject.toml            # fastapi, uvicorn, pydantic, pyyaml; dev: pytest, httpx, ruff, mypy
├── src/gin_console/
│   ├── config.py             # load + validate YAML → Settings      (REQ-CONFIG-*)
│   ├── app.py                # create_app(settings): routers + static/SPA  (REQ-SERVER-002, -004)
│   ├── __main__.py           # load settings, loopback guard, uvicorn  (REQ-SERVER-001)
│   └── projects/
│       ├── models.py         # Project{name, path, scotty_id, exists}
│       ├── source.py         # list_projects(settings) → list[Project]
│       └── router.py         # GET /api/projects                   (REQ-SERVER-003)
└── tests/
frontend/                     # Vite + React + TS + Tailwind + shadcn/ui, pnpm
└── src/
    ├── app/                  # shell, routing, layout (sidebar)
    ├── components/ui/        # shadcn components
    └── features/projects/    # api.ts, ProjectsPage      (REQ-UI-001, -002)
deploy/
└── gin-console.service       # systemd user unit         (REQ-DEPLOY-001)
config.example.yaml
```

Config schema:

```yaml
server:            # optional; defaults shown
  host: 127.0.0.1
  port: 8700
projects:
  - name: qwikfone
    path: /home/gin/qwikfone
    scotty_id: qwikfone   # optional
```

systemd unit essentials: `ExecStart=<uv> --directory %h/gin-console/backend run python -m gin_console`, `Restart=on-failure`, `RestartSec=5`, `StartLimitIntervalSec=60`, `StartLimitBurst=3`. Install: copy to `~/.config/systemd/user/`, `systemctl --user daemon-reload`, `systemctl --user enable --now gin-console`, `sudo loginctl enable-linger gin`.

Tailscale (REQ-DEPLOY-002): `tailscale serve --bg --https=8443 http://127.0.0.1:8700`; `tailscale serve --https=443 --set-path=/bd off`.

## Data Flow

```
start:   __main__ → load_settings() → loopback guard → create_app(settings) → uvicorn(127.0.0.1:8700)
request: browser → tailscale serve :8443 → FastAPI
         /api/health   → {status, version}
         /api/projects → projects.source.list_projects(settings) → [Project]
         /api/*        → 404
         /*            → frontend/dist (fallback index.html; 503 if not built)
frontend: features/projects/api.ts → fetch('/api/projects') → ProjectsPage
```

Config is read once at startup; changing it requires `systemctl --user restart gin-console`. `exists` is checked per request with `Path.is_dir()`.

The static directory defaults to `frontend/dist` relative to the repository root and is passed to `create_app` so tests can point it at a temp directory.

## Error Handling

| Condition | Behavior |
|---|---|
| Config file missing | Exit non-zero; message names the path tried and suggests copying `config.example.yaml` |
| Invalid YAML / schema error / duplicate name / relative path | Exit non-zero; message names the failing field (pydantic error) |
| Non-loopback host without override | Exit non-zero; message explains the `tailscale serve` requirement |
| Project path missing | Keep running; `exists: false`; UI shows a "missing" badge |
| Frontend not built | API works; non-API paths return 503 naming `pnpm -C frontend build` |
| API call fails in the browser | Error message with a retry button |

Startup errors go to stderr, visible in `journalctl --user -u gin-console`; `StartLimitBurst` prevents an endless restart loop.

## Testing

Backend (pytest, FastAPI `TestClient`, `tmp_path`), test names or comments carry the REQ-ID:
- config: default path, `GIN_CONSOLE_CONFIG` override, server defaults, missing file, invalid YAML, duplicate name, relative path.
- loopback guard: `127.0.0.1` and `::1` allowed; `0.0.0.0` and a tailnet IP refused; override allows. The guard is a pure function tested without starting uvicorn.
- API: health 200; projects order and `exists`; path created after startup.
- static: SPA fallback, `/api/unknown` 404, 503 without `dist`.

Frontend (vitest + Testing Library, mocked `fetch`): list with missing badge, empty state, error then retry.

`verify.checks`:

| check | command |
|---|---|
| lint | `uv --directory backend run ruff check . && pnpm -C frontend lint` |
| typecheck | `uv --directory backend run mypy && pnpm -C frontend typecheck` |
| test | `uv --directory backend run pytest && pnpm -C frontend test --run` |
| build | `pnpm -C frontend build` |
| e2e | (empty) |

Tool config: ruff `select = ["E","F","I","B","UP","BLE"]`, mypy `strict = true`, tsconfig `strict`, typescript-eslint `recommendedTypeChecked`, eslint-plugin-react-hooks. After updating `verify.checks` with `gin-workflow setup configure`, run `gin-workflow hooks install`.

REQ-DEPLOY-001 and REQ-DEPLOY-002 are verified manually (`tests.md`).

## Assumptions

- `uv` is installed during implementation (not present on the host today).
- The repository lives at `/home/gin/gin-console`.
- Port 8700 and tailnet HTTPS port 8443 are free.
