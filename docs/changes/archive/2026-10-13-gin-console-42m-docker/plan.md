# Plan: Docker

Epic: gin-console-42m
Spec: docs/changes/gin-console-42m-docker/ (proposal.md, spec-delta.md, design.md, tests.md)
ADR: docs/adr/0001-single-process-modular-contexts.md

## Objective

`docker compose up -d` runs the same single console process in a container that carries every tool the console uses. It reads the host config, projects, `~/.claude`, and `~/.codex` at the same paths as the host, and is published only on `127.0.0.1:8700` for `tailscale serve`.

## Goal, Architecture, Tech Stack (from the spec)

- Goal: operators can run the console from a container instead of the systemd user service, with no extra installs on the host.
- Architecture: Docker is an alternative way to run the one process from ADR 0001; the only application change is the `GIN_CONSOLE_HOST` override. A multi-stage `Dockerfile` (frontend build stage, runtime stage), a `docker-compose.yml`, and a smoke script.
- Tech stack: Docker 29 with BuildKit and Compose v2 (aarch64 host), `node:22-bookworm-slim` base, uv-managed Python 3.12, `bd` / `claude` / `codex` via npm, `gin-workflow` from a pinned git ref.

## Global Constraints

- Read-only console: the app never writes to projects, Beads, or sessions. `~/.claude` and `~/.codex` are mounted read-only.
- Access only via Tailscale: publish only `127.0.0.1:8700`; the container binds `0.0.0.0` only with `GIN_CONSOLE_ALLOW_NON_LOOPBACK=1`.
- Same host paths inside the container (uid 1002, `HOME=/home/gin`); the same `config.yaml` works in both modes.
- Non-goals: Tailscale sidecar, public exposure, registry publishing, multi-arch builds, running systemd and Docker at the same time.
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
- Problem statement: the console needs uv, pnpm, and several CLIs on the host; a container makes the environment reproducible and self-contained.
- Success criteria: REQ-DOCKER-007 has passing automated tests; REQ-DOCKER-001..006 pass the manual cases in `tests.md` through `scripts/docker-smoke.sh`; the systemd deployment is unchanged.
- Constraints: see Global Constraints.
- Non-goals: see Global Constraints.

## Approach Options
### Option 1: Node base image, uv installs Python (selected)
- Summary: `node:22-bookworm-slim` carries npm for `claude`/`codex`/`bd`; `uv sync` downloads Python 3.12 from the lockfile's `requires-python`.
- Pros: one apt layer, current Node for the npm CLIs, Python exactly as in development.
- Cons: first build downloads Python.

### Option 2: Python base image plus Debian nodejs
- Summary: `python:3.12-slim` with Debian's `nodejs` and `npm`.
- Pros: no Python download.
- Cons: Debian bookworm ships Node 18, older than the npm CLIs expect.

### Recommended Approach
- Selected option: Option 1.
- Reasoning: the CLIs are the version-sensitive part, and uv already pins Python.

## Scope
- In scope: REQ-DOCKER-001..007, `deploy/README.md` Docker section.
- Out of scope: everything listed under non-goals.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: Two tracks, the second depends on the first; one agent working in order is simplest.
```

## File Map

| File | Responsibility | Track |
|---|---|---|
| `backend/src/gin_console/config.py` (modify) | `HOST_ENV`, `effective_host` | 1 |
| `backend/src/gin_console/__main__.py` (modify) | use `effective_host` for the guard and uvicorn | 1 |
| `backend/tests/test_config.py` (modify) | `effective_host` tests | 1 |
| `backend/tests/test_main.py` (modify) | override and guard tests | 1 |
| `Dockerfile` | multi-stage image | 2 |
| `.dockerignore` | keep caches, venv, node_modules, `.git`, `.planning` out of the context | 2 |
| `docker-compose.yml` | service, mounts, port, env | 2 |
| `docker-compose.override.example.yml` | per-project mounts (copied to the git-ignored override) | 2 |
| `.env.example` | `APP_UID`, `APP_GID`, `GIN_WORKFLOW_REF` | 2 |
| `.gitignore` (modify) | ignore `.env` and `docker-compose.override.yml` | 2 |
| `scripts/docker-smoke.sh` | post-start checks (TC-1..TC-5) | 2 |
| `deploy/README.md` (modify) | Docker section | 2 |

## Tasks

### Track 1: GIN_CONSOLE_HOST override
- **Dependencies**: none
- **Requirements**: REQ-DOCKER-007
- **Files**: modify `backend/src/gin_console/config.py`, `backend/src/gin_console/__main__.py`, `backend/tests/test_config.py`, `backend/tests/test_main.py`
- **Provider role**: `backend`
- **Reasoning**: `low`
- **Model class**: `cheap_simple`
- **Acceptance criteria**: both scenarios of REQ-DOCKER-007 have passing tests; the existing 34 backend tests still pass; `uv --directory backend run ruff check .` and `uv --directory backend run mypy` are clean.
- **Estimated complexity**: low

**Interfaces produced**
```python
# gin_console.config
HOST_ENV: str = "GIN_CONSOLE_HOST"
def effective_host(settings: Settings, env: Mapping[str, str]) -> str
```

**Steps**

1. Add failing tests to `backend/tests/test_config.py` (import `HOST_ENV`, `effective_host`, `ServerSettings`, `Settings` as needed):
   ```python
   # REQ-DOCKER-007
   def test_effective_host_env_overrides_config() -> None:
       settings = Settings(server=ServerSettings(host="127.0.0.1"))
       assert effective_host(settings, {HOST_ENV: "0.0.0.0"}) == "0.0.0.0"


   # REQ-DOCKER-007
   def test_effective_host_defaults_to_config() -> None:
       settings = Settings(server=ServerSettings(host="127.0.0.1"))
       assert effective_host(settings, {}) == "127.0.0.1"
       assert effective_host(settings, {HOST_ENV: ""}) == "127.0.0.1"
   ```
2. Edit `backend/tests/test_main.py` (import `HOST_ENV`). Give `run_main` a new parameter `host_env: str | None = None`; right after the existing `if allow: ... else: ...` block add:
   ```python
   monkeypatch.delenv(HOST_ENV, raising=False)
   if host_env:
       monkeypatch.setenv(HOST_ENV, host_env)
   ```
   Then add the failing tests:
   ```python
   # REQ-DOCKER-007
   def test_main_host_env_overrides_config(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
       calls = run_main(monkeypatch, tmp_path, "projects: []\n", allow=True, host_env="0.0.0.0")
       assert calls == [("0.0.0.0", 8700)]


   # REQ-DOCKER-007
   def test_main_host_env_still_hits_guard(
       monkeypatch: pytest.MonkeyPatch, tmp_path: Path, capsys: pytest.CaptureFixture[str]
   ) -> None:
       config = tmp_path / "config.yaml"
       config.write_text("projects: []\n")
       monkeypatch.setenv(CONFIG_ENV, str(config))
       monkeypatch.setenv(HOST_ENV, "0.0.0.0")
       monkeypatch.delenv(ALLOW_NON_LOOPBACK_ENV, raising=False)
       assert main() == 1
       assert "0.0.0.0" in capsys.readouterr().err
   ```
3. Run `uv --directory backend run pytest -q` and see the new tests fail (`ImportError` on `HOST_ENV`).
4. In `config.py` add after `ALLOW_NON_LOOPBACK_ENV`:
   ```python
   HOST_ENV = "GIN_CONSOLE_HOST"
   ```
   and after `resolve_config_path`:
   ```python
   def effective_host(settings: Settings, env: Mapping[str, str]) -> str:
       return env.get(HOST_ENV) or settings.server.host
   ```
5. In `__main__.py` replace the guard and run call:
   ```python
   settings = load_settings(resolve_config_path(os.environ))
   host = effective_host(settings, os.environ)
   check_bind_host(host, os.environ)
   ...
   uvicorn.run(create_app(settings), host=host, port=settings.server.port)
   ```
   and import `effective_host`.
6. Run `uv --directory backend run pytest -q && uv --directory backend run ruff check . && uv --directory backend run mypy`; expect 38 passed and clean linters.
7. Commit: `feat(backend): add GIN_CONSOLE_HOST override`.

### Track 2: Image, compose, smoke script, docs
- **Dependencies**: Track 1
- **Requirements**: REQ-DOCKER-001, REQ-DOCKER-002, REQ-DOCKER-003, REQ-DOCKER-004, REQ-DOCKER-005, REQ-DOCKER-006
- **Files**: create `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `docker-compose.override.example.yml`, `.env.example`, `scripts/docker-smoke.sh`; modify `.gitignore`, `deploy/README.md`
- **Provider role**: `backend`
- **Reasoning**: `medium`
- **Model class**: `standard_impl`
- **Acceptance criteria**: `docker compose build` succeeds on the arm64 host; `scripts/docker-smoke.sh` exits 0 against the running stack and covers TC-1..TC-5; the systemd service keeps running on `:8700` untouched until the user stops it for the Docker run.
- **Estimated complexity**: medium

**Steps**

1. Create `.dockerignore`:
   ```
   .git
   .planning
   .beads
   .agent-workflow
   .claude
   .codex
   .agents
   docs
   backend/.venv
   backend/.*_cache
   **/__pycache__
   frontend/node_modules
   frontend/dist
   ```
2. Create `Dockerfile`:
   ```dockerfile
   # syntax=docker/dockerfile:1.7
   ARG UV_VERSION=0.13.0

   FROM node:22-bookworm-slim AS frontend
   ARG PNPM_VERSION=10.32.1
   RUN npm install -g pnpm@${PNPM_VERSION}
   WORKDIR /src/frontend
   COPY frontend/package.json frontend/pnpm-lock.yaml ./
   RUN pnpm install --frozen-lockfile
   COPY frontend/ ./
   RUN pnpm build

   FROM ghcr.io/astral-sh/uv:${UV_VERSION} AS uv

   FROM node:22-bookworm-slim AS runtime
   ARG BD_VERSION=1.0.5
   ARG CLAUDE_VERSION=2.1.296
   ARG CODEX_VERSION=0.160.0
   ARG GIN_WORKFLOW_REF=v1.4.2
   ARG GIN_WORKFLOW_REPO=https://github.com/giangdhwhtbr/gin-workflow.git
   ARG APP_UID=1002
   ARG APP_GID=1002

   RUN apt-get update \
    && apt-get install -y --no-install-recommends git curl ca-certificates python3 python3-yaml \
    && rm -rf /var/lib/apt/lists/*
   COPY --from=uv /uv /usr/local/bin/uv

   RUN npm install -g @beads/bd@${BD_VERSION} @anthropic-ai/claude-code@${CLAUDE_VERSION} @openai/codex@${CODEX_VERSION}

   # gin-workflow: pinned ref
   RUN git clone --depth 1 --branch "${GIN_WORKFLOW_REF}" "${GIN_WORKFLOW_REPO}" /tmp/gw \
    && cp -r /tmp/gw/plugins/gin-workflow/src/scripts /opt/gin-workflow \
    && chmod +x /opt/gin-workflow/gin-workflow \
    && ln -s /opt/gin-workflow/gin-workflow /usr/local/bin/gin-workflow \
    && rm -rf /tmp/gw

   WORKDIR /app/backend
   ENV UV_PYTHON_INSTALL_DIR=/opt/python UV_PROJECT_ENVIRONMENT=/opt/venv UV_LINK_MODE=copy
   COPY backend/pyproject.toml backend/uv.lock ./
   COPY backend/src ./src
   RUN uv sync --frozen --no-dev
   COPY --from=frontend /src/frontend/dist /app/frontend/dist

   RUN groupadd -g ${APP_GID} gin && useradd -m -u ${APP_UID} -g gin -s /bin/sh gin
   USER gin
   ENV HOME=/home/gin
   EXPOSE 8700
   CMD ["/opt/venv/bin/python", "-m", "gin_console"]
   ```
   `DEFAULT_STATIC_DIR` is `parents[3] / "frontend" / "dist"` of `app.py`; with the editable install at `/app/backend/src/gin_console/app.py` that resolves to `/app/frontend/dist`.
3. Create `docker-compose.yml`:
   ```yaml
   services:
     gin-console:
       build:
         context: .
         args:
           APP_UID: ${APP_UID:-1002}
           APP_GID: ${APP_GID:-1002}
           GIN_WORKFLOW_REF: ${GIN_WORKFLOW_REF:-v1.4.2}
       image: gin-console:local
       user: "${APP_UID:-1002}:${APP_GID:-1002}"
       restart: on-failure:3
       ports:
         - "127.0.0.1:8700:8700"
       environment:
         HOME: ${HOME}
         GIN_CONSOLE_HOST: 0.0.0.0
         GIN_CONSOLE_ALLOW_NON_LOOPBACK: "1"
       volumes:
         - ${HOME}/.config/gin-console/config.yaml:${HOME}/.config/gin-console/config.yaml:ro
         - ${HOME}/.claude:${HOME}/.claude:ro
         - ${HOME}/.codex:${HOME}/.codex:ro
         # project directories: see docker-compose.override.example.yml
   ```
4. Create `docker-compose.override.example.yml`:
   ```yaml
   # Copy to docker-compose.override.yml (git-ignored) and list every project from config.yaml.
   services:
     gin-console:
       volumes:
         - /home/gin/qwikfone:/home/gin/qwikfone
         - /home/gin/scotty:/home/gin/scotty
         - /home/gin/gin-workflow:/home/gin/gin-workflow
   ```
5. Create `.env.example`:
   ```
   APP_UID=1002
   APP_GID=1002
   GIN_WORKFLOW_REF=v1.4.2
   ```
   and append to `.gitignore`:
   ```gitignore
   # Docker
   .env
   docker-compose.override.yml
   ```
6. Create `scripts/docker-smoke.sh` (executable). It runs against the compose stack and exits non-zero on the first failure:
   ```sh
   #!/usr/bin/env sh
   set -eu
   exec_in() { docker compose exec -T gin-console sh -c "$1"; }
   fail() { echo "FAIL: $1" >&2; exit 1; }

   # REQ-DOCKER-001 (TC-1)
   exec_in 'uv --version && git --version && bd --version && gin-workflow --version && claude --version && codex --version' >/dev/null || fail "tools missing"
   # REQ-DOCKER-002 (TC-2)
   [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/health)" = 200 ] || fail "health"
   # REQ-DOCKER-003 / -004 (TC-3, TC-4)
   exec_in "test -d \"$HOME/.claude\" && test -d \"$HOME/.codex\"" || fail "login dirs not mounted"
   if exec_in "touch \"$HOME/.claude/.smoke\"" 2>/dev/null; then fail ".claude is writable"; fi
   project=$(docker compose exec -T gin-console sh -c 'ls -d /home/gin/*/.beads 2>/dev/null | head -n1 | xargs dirname' | tr -d '\r')
   [ -n "$project" ] || fail "no mounted project with .beads"
   exec_in "cd '$project' && bd list >/dev/null" || fail "bd list in $project"
   # REQ-DOCKER-005 (TC-5)
   ip=$(hostname -I | awk '{print $1}')
   if curl -s -m 3 -o /dev/null "http://$ip:8700/"; then fail "reachable on $ip:8700"; fi
   echo "docker smoke: ok"
   ```
7. Build and run: stop the systemd service for the check (`systemctl --user stop gin-console`), `cp docker-compose.override.example.yml docker-compose.override.yml`, then `docker compose build` and `docker compose up -d`; run `scripts/docker-smoke.sh` and expect `docker smoke: ok`. Fix any failing step (expected risks: `@beads/bd` postinstall binary for arm64, `HOME` mount paths, `bd` Dolt lock on the mounted project). Keep the failing output as evidence in the bead notes.
8. TC-5 second half: with the container running, `tailscale serve status` already points `:8443` at `127.0.0.1:8700`; open `https://instance-20260515-2304.tail5ca54e.ts.net:8443` from a tailnet device (user step) and confirm the Projects page.
9. Build smoke check: build once with `docker compose build --no-cache`.
10. Add a `## Docker` section to `deploy/README.md`: prerequisites (Docker with Compose and BuildKit), `cp .env.example .env`, `cp docker-compose.override.example.yml docker-compose.override.yml` and list projects, `docker compose build && docker compose up -d`, `scripts/docker-smoke.sh`, `docker compose logs -f`, the `tailscale serve` command (unchanged), and a warning that Docker and the systemd service share port 8700.
11. Restart the systemd service afterwards (`docker compose down && systemctl --user start gin-console`) unless the user chooses Docker as the running mode.
12. Commit: `feat(deploy): add Dockerfile, compose, and smoke script`.

## Integration
- **Branch**: `feat/gin-console-42m-docker` (worktree under `.planning/worktrees/gin-console-42m`)
- **Merge strategy**: sequential

## Validation
- [ ] `uv --directory backend run pytest -q` passes (38 tests)
- [ ] `uv --directory backend run ruff check .` and `mypy` clean
- [ ] `docker compose build` succeeds on arm64
- [ ] `scripts/docker-smoke.sh` prints `docker smoke: ok`
- [ ] TC-6 shows no secret in layers or filesystem
- [ ] User confirms TC-5 from another tailnet device
- [ ] The systemd service is running again afterwards

## Notes
- Model guidance is planning metadata, not Beads state.
- Docker cannot be tried without stopping the systemd service because both use port 8700; the plan stops and restarts it explicitly (user-visible side effect).
- The editable uv install keeps `DEFAULT_STATIC_DIR` correct (`/app/frontend/dist`); do not move the backend directory in the image.
- Implementation deviation: `@beads/bd` from npm fails because the `v1.0.5` release has no binary assets, and `bd` 1.3.1 cannot read existing schema v49 project databases. The image builds `bd` from the `v1.0.5` tag in a `golang:1.26-bookworm` stage (`CGO_ENABLED=1`, tag `gms_pure_go`).
- `bd` writes `.beads/.local_version` and Dolt files even for reads, so project mounts stay read-write.
