# Design: Docker

Epic: gin-console-42m

## Architecture

Docker is an alternative way to run the same single process described in `docs/adr/0001-single-process-modular-contexts.md`; no application code changes. The only application change is the `GIN_CONSOLE_HOST` override; the existing `GIN_CONSOLE_ALLOW_NON_LOOPBACK=1` bind guard stays.

```
Dockerfile                # multi-stage                               (REQ-DOCKER-001, -006)
  stage frontend          # node + pnpm: pnpm install --frozen-lockfile && pnpm build
  stage runtime           # python:3.12-slim (arm64)
                          #   apt: git, curl, ca-certificates, nodejs+npm (for claude/codex)
                          #   uv, bd (release binary), claude + codex (npm, pinned),
                          #   gin-workflow (git clone at ref, BuildKit secret for auth)
                          #   uv sync --frozen; COPY --from=frontend dist
                          #   USER uid:gid from build args (default 1002), HOME=/home/gin
docker-compose.yml        # service gin-console                       (REQ-DOCKER-002..005)
.env.example              # UID, GID, PROJECT_DIRS notes, GIN_WORKFLOW_REF
scripts/docker-smoke.sh   # post-start checks
deploy/README.md          # + Docker section
```

Build args: `BD_VERSION`, `CLAUDE_VERSION`, `CODEX_VERSION`, `GIN_WORKFLOW_REF`, `APP_UID`, `APP_GID`. Defaults match the versions on the host (bd 1.0.5, claude 2.1.296, codex 0.160.0).

Compose mounts, all at identical host paths: `${HOME}/.config/gin-console/config.yaml` ro, each project directory rw (listed in `docker-compose.override.yml`, kept out of git, with an example), `${HOME}/.claude` ro, `${HOME}/.codex` ro. Port mapping `127.0.0.1:8700:8700`. The shared host config says `server.host: 127.0.0.1`, which the published port cannot reach from inside the container. The one application change is a `GIN_CONSOLE_HOST` environment variable that overrides `server.host` (REQ-DOCKER-007); compose sets `GIN_CONSOLE_HOST=0.0.0.0` and `GIN_CONSOLE_ALLOW_NON_LOOPBACK=1`, and the existing bind guard still validates the result. The change lives in `config.py` next to `check_bind_host`.

## Data Flow

Browser → tailnet → host `tailscale serve :8443` → `127.0.0.1:8700` (published port) → container uvicorn → mounted project directories and CLIs. Nothing flows out except to the tailnet client.

## Error Handling

- Invalid config: the process exits non-zero and compose shows the message; `restart: on-failure:3` mirrors the systemd start limit.
- Missing project mount: the Projects page shows the existing "missing" badge.
- Private `gin-workflow` repo without a secret: the build fails at the clone step with a clear message.

## Testing

`scripts/docker-smoke.sh` (manual or CI) runs after `docker compose up -d`: health 200, tool versions, a mounted project is visible, `bd list` works, `~/.claude` is read-only, and the port is bound to loopback only. The existing pytest and vitest suites are unchanged.
