# Deploying gin-console

The console runs as a systemd user service on `127.0.0.1:8700` and is exposed to the tailnet
only through `tailscale serve`.

## Install

```bash
mkdir -p ~/.config/gin-console ~/.config/systemd/user
cp config.example.yaml ~/.config/gin-console/config.yaml   # then edit the project list
uv --directory backend sync --frozen
pnpm -C frontend install --frozen-lockfile && pnpm -C frontend build
cp deploy/gin-console.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now gin-console
sudo loginctl enable-linger gin
```

### PATH of the service

systemd starts user services with a minimal `PATH` (system directories only), not your shell's. The
console runs `bd`, `gin-workflow`, `claude` and `codex`, so the unit sets `Environment=PATH=...`
(`~/.local/bin`, `~/.npm-global/bin`, Homebrew's `bin`, then the system directories). Check each tool
with `command -v bd gin-workflow claude codex` in your shell and edit that line of
`~/.config/systemd/user/gin-console.service` if one lives elsewhere, then
`systemctl --user daemon-reload && systemctl --user restart gin-console`. A tool that cannot be found
shows up in the UI as "<tool> not found" (project cards, Quota page).

## Update

```bash
git pull
uv --directory backend sync --frozen
pnpm -C frontend install --frozen-lockfile && pnpm -C frontend build
systemctl --user restart gin-console
```

## Tailscale

```bash
tailscale serve --bg --https=8443 http://127.0.0.1:8700
tailscale serve status
```

Prefix with `sudo` if your user is not the Tailscale operator.

## Logs

```bash
journalctl --user -u gin-console -f
```

## Docker

An alternative to the systemd service. Both use port 8700, so run only one at a time (`systemctl --user stop gin-console` first).

```bash
cp .env.example .env                                           # uid/gid, gin-workflow ref
cp docker-compose.override.example.yml docker-compose.override.yml   # list every project from config.yaml
GH_TOKEN="${GH_TOKEN:-}" docker compose build                  # GH_TOKEN only if the gin-workflow repo is private
GH_TOKEN="${GH_TOKEN:-}" docker compose up -d
scripts/docker-smoke.sh
docker compose logs -f
```

- The container runs as your uid (default 1002) with `HOME=/home/gin` and mounts the config, projects, `~/.claude`, and `~/.codex` at the same paths as on the host, so the same `config.yaml` works in both modes. `~/.claude` and `~/.codex` are read-only; projects are read-write because `bd` writes `.beads/.local_version` and Dolt files even for reads.
- The port is published on `127.0.0.1:8700` only; `tailscale serve --https=8443 http://127.0.0.1:8700` is unchanged.
- The image carries `uv`, `git`, `bd`, `gin-workflow`, `claude`, and `codex`. Versions are build args (`BD_VERSION`, `CLAUDE_VERSION`, `CODEX_VERSION`, `GIN_WORKFLOW_REF`). `bd` is built from source because 1.0.5 has no release binary.
- Switch back: `docker compose down && systemctl --user start gin-console`.

