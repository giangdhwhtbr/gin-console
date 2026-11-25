# gin-console

A web-based dashboard and observability console for [gin-workflow](https://github.com/giangdhwhtbr/gin-workflow) projects and [Beads](https://github.com/gastownhall/beads) issue tracking.

---

## Features

- **Native Beads Explorer**: Interactive Kanban board, hierarchical list, and visual dependency graph with a one-line filter bar: the milestone, status and assignee as removable chips, and priority, labels, type, kind, capability and sprint under More filters; from 1024px a click selects a bead and shows its details beside every view.
- **Milestones**: Dated milestones per project with a Gantt of the working-day schedule, a dependency graph per milestone, and a read-only kick-start preview (needs a gin-workflow with the `milestone` command and Beads task tracking).
- **Reports**: Five sections (`/reports/status`, `/reports/team`, `/reports/delivery`, `/reports/velocity`, `/reports/rework`) sharing one scope (a dated milestone or the last 7, 30, or 90 days), with a milestone Status brief and Team KPI v2.
- **Requirements**: Every requirement of a project with its status, sign-off, beads and test cases, its change folders, and its confirmed mockups (needs a gin-workflow with `gin specs trace --all`).
- **Cross-Platform**: First-class support for Linux, macOS, and native Windows (no WSL required).

---

## Prerequisites

Before installing, ensure the following are installed on your machine:

- **Python 3.12+**
- [**uv**](https://docs.astral.sh/uv/) (recommended fast Python package manager)
- **Node.js (v20+ or v22+)** and [**pnpm**](https://pnpm.io/)
- **Git** (on Windows, **Git for Windows** is required)
- [**bd** (Beads CLI)](https://github.com/gastownhall/beads) in your system `PATH`, to write each project's export file. The console runs only `bd dolt pull`; see [Beads export](#beads-export) and [Pulling Beads](#pulling-beads).

---

## Installation & Setup

### Windows (Native)

`gin-console` supports running natively on Windows without requiring WSL2 or Docker.

#### 1. Install Prerequisites

Open **PowerShell** or **Windows Terminal**:

```powershell
# Install uv (if not already installed)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# Or install via winget:
# winget install astral-sh.uv
# winget install Git.Git
# winget install OpenJS.NodeJS.LTS

# Enable or install pnpm
npm install -g pnpm
```

> **Note on Git for Windows**: Ensure Git for Windows is installed (default path: `C:\Program Files\Git\bin\bash.exe`). The console automatically runs the `gin.cmd` shim that the gin-workflow `install.ps1` puts on `PATH`; without it, it runs `gin` through `bash.exe`.

#### 2. Clone the Repository

```powershell
git clone https://github.com/giangdhwhtbr/gin-console.git
cd gin-console
```

#### 3. Create Configuration

`gin-console` looks for its configuration file at `%USERPROFILE%\.config\gin-console\config.yaml` by default.

Create the directory and copy the example config:

```powershell
New-Item -ItemType Directory -Force -Path "$HOME\.config\gin-console"
Copy-Item config.example.yaml "$HOME\.config\gin-console\config.yaml"
```

Edit `%USERPROFILE%\.config\gin-console\config.yaml` with your projects:

```yaml
server:
  host: 127.0.0.1
  port: 8700
projects:
  - name: my-project
    path: C:\Users\YourUsername\projects\my-project
  - name: another-project
    path: D:\code\another-project
```

> **Path Note**: On Windows, specify absolute paths using drive letters (e.g., `C:\Users\...` or `C:/Users/...`).

#### 4. Install Dependencies & Build

```powershell
# 1. Install Python backend dependencies
cd backend
uv sync

# 2. Install frontend dependencies and build the UI
cd ..\frontend
pnpm install
pnpm build
cd ..
```

#### 5. Start gin-console

Run the console server:

```powershell
uv run --directory backend -m gin_console
```

Open your browser and navigate to:
**[http://127.0.0.1:8700](http://127.0.0.1:8700)**

#### Windows Tips

- **Custom Config Location**: To use a custom configuration file path, set the `GIN_CONSOLE_CONFIG` environment variable:
  ```powershell
  $env:GIN_CONSOLE_CONFIG = "C:\path\to\config.yaml"
  uv run --directory backend -m gin_console
  ```
- To listen on other machines, see [Listening on all interfaces](#listening-on-all-interfaces).

---

### Linux & macOS

#### 1. Install Prerequisites

Ensure Python 3.12+, `uv`, Node.js, and `pnpm` are installed:

```bash
# Install uv (if needed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install pnpm (if needed)
npm install -g pnpm
```

#### 2. Clone the Repository

```bash
git clone https://github.com/giangdhwhtbr/gin-console.git
cd gin-console
```

#### 3. Create Configuration

```bash
mkdir -p ~/.config/gin-console
cp config.example.yaml ~/.config/gin-console/config.yaml
```

Edit `~/.config/gin-console/config.yaml` to point to your project directories:

```yaml
server:
  host: 127.0.0.1
  port: 8700
projects:
  - name: my-project
    path: /home/username/projects/my-project
```

#### 4. Install Dependencies & Build

```bash
uv --directory backend sync
pnpm -C frontend install
pnpm -C frontend build
```

#### 5. Start the Server

```bash
uv run --directory backend -m gin_console
```

Open your browser at **[http://127.0.0.1:8700](http://127.0.0.1:8700)**.

> For production deployment as a **systemd user service** and exposing over **Tailscale**, see [deploy/README.md](deploy/README.md).

To listen on other machines, see [Listening on all interfaces](#listening-on-all-interfaces).

---

## Docker Deployment

An optional Docker Compose deployment is available:

```bash
cp .env.example .env
cp docker-compose.override.example.yml docker-compose.override.yml
# Edit docker-compose.override.yml to mount your project directories

docker compose build
docker compose up -d
```

Check the health and smoke test:

```bash
scripts/docker-smoke.sh
```

---

## Listening on all interfaces

gin-console listens on `127.0.0.1` by default and refuses any other address. It has no authentication, so it is meant to stay on loopback behind `tailscale serve`. To listen on every interface, set both `GIN_CONSOLE_HOST=0.0.0.0` and `GIN_CONSOLE_ALLOW_NON_LOOPBACK=1`. `GIN_CONSOLE_HOST` overrides `server.host` in the config. You can set `server.host: 0.0.0.0` in the config instead, but `GIN_CONSOLE_ALLOW_NON_LOOPBACK=1` is still required.

> **Warning**: gin-console has no authentication. The email on the login screen only selects "My work"; it is not a password. Anyone who can reach the port can read projects and Beads. Allow the port only from trusted networks, for example behind a firewall or a VPN.

### Linux and macOS

Set both variables for a single run:

```bash
GIN_CONSOLE_HOST=0.0.0.0 GIN_CONSOLE_ALLOW_NON_LOOPBACK=1 uv run --directory backend -m gin_console
```

### systemd user service

Add both variables to a drop-in for the `gin-console` unit, then restart it:

```bash
systemctl --user edit gin-console
```

```ini
[Service]
Environment=GIN_CONSOLE_HOST=0.0.0.0
Environment=GIN_CONSOLE_ALLOW_NON_LOOPBACK=1
```

```bash
systemctl --user restart gin-console
```

### Docker

The container already listens on `0.0.0.0` with both variables set in `docker-compose.yml`. Only the published address is limited to loopback (`127.0.0.1:8700:8700`). To publish the port on every interface, add this to `docker-compose.override.yml`:

```yaml
services:
  gin-console:
    ports: !override
      - "0.0.0.0:8700:8700"
```

`!override` needs Docker Compose 2.24 or later.

### Windows

Set the variables for the current session, or for your user account so that new terminals inherit them.

#### PowerShell for this session

```powershell
$env:GIN_CONSOLE_HOST = "0.0.0.0"
$env:GIN_CONSOLE_ALLOW_NON_LOOPBACK = "1"
uv run --directory backend -m gin_console
```

#### PowerShell for the user account

```powershell
[Environment]::SetEnvironmentVariable("GIN_CONSOLE_HOST", "0.0.0.0", "User")
[Environment]::SetEnvironmentVariable("GIN_CONSOLE_ALLOW_NON_LOOPBACK", "1", "User")
```

Open a new terminal afterwards. The same variables can be set with `setx GIN_CONSOLE_HOST 0.0.0.0` and `setx GIN_CONSOLE_ALLOW_NON_LOOPBACK 1`.

#### Command Prompt for this session

```bat
set GIN_CONSOLE_HOST=0.0.0.0
set GIN_CONSOLE_ALLOW_NON_LOOPBACK=1
uv run --directory backend -m gin_console
```

#### Firewall

Windows may ask to allow Python through Windows Defender Firewall on first start. Allow it on private networks only. To add a rule instead, run this in an elevated PowerShell:

```powershell
New-NetFirewallRule -DisplayName "gin-console" -Direction Inbound -Protocol TCP -LocalPort 8700 -Action Allow -Profile Private
```

#### Undo

For this session:

```powershell
Remove-Item Env:GIN_CONSOLE_HOST, Env:GIN_CONSOLE_ALLOW_NON_LOOPBACK
```

For the user account:

```powershell
[Environment]::SetEnvironmentVariable("GIN_CONSOLE_HOST", $null, "User")
[Environment]::SetEnvironmentVariable("GIN_CONSOLE_ALLOW_NON_LOOPBACK", $null, "User")
```

### Check the bind

From another device, open `http://<machine-ip>:8700`. If `GIN_CONSOLE_ALLOW_NON_LOOPBACK` is missing, the console exits with `refusing to bind 0.0.0.0`. If `GIN_CONSOLE_HOST` is missing, the console listens on loopback only and the other device cannot connect.

---

## Beads export

gin-console reads each project's beads from `.beads/issues.jsonl`. The only `bd` command it runs is `bd dolt pull` (see [Pulling Beads](#pulling-beads)), so the file must exist and stay current. Run these three commands once in each project directory. They work the same in bash, PowerShell and cmd:

```bash
bd config set export.auto true
bd config set export.interval 1s
bd export -o .beads/issues.jsonl
```

The first two commands write to the project's `.beads/config.yaml`. The last one writes the file now. After that, each `bd` write updates it.

Without the file, the console shows an error for that project that names these commands.

`bd` skips an automatic export that comes less than `export.interval` after the previous one. The console then shows a note that the project's beads may be out of date. Run `bd export -o .beads/issues.jsonl`, or make another `bd` write after the interval, to refresh it.

The bead page no longer shows a reopen count.

---

## Pulling Beads

**Refresh data** runs `bd dolt pull` in each configured project before it reloads, so beads pushed to a project's Dolt remote from other machines show up. It pulls at most four projects at a time and stops a pull after 30 seconds. Each project card shows the last pull: "pulled 2 minutes ago", "no Dolt remote", or "pull failed: <error>". When a pull fails, the Beads and My work pages show the command to run by hand.

To pull on a schedule as well, set `beads.pull_interval` to whole seconds, minutes or hours of at least one minute, such as `90s`, `5m` or `1h`. Without it, or with `0`, the console pulls only on Refresh. To leave a project out of every pull, set `pull: false` on it:

```yaml
beads:
  pull_interval: 5m
projects:
  - name: scratch
    path: /home/gin/scratch
    pull: false
```

To change when the Overview lists a bead as in progress too long, set `overview.aging_days` to a whole number of working days of at least 1 (default 3). An install from before this setting refuses the key and does not start.

```yaml
overview:
  aging_days: 5
```

The console only pulls. It never pushes, commits, exports, or resolves a merge conflict. When a card shows a merge conflict, resolve it with `bd` in that project, then select **Refresh data**. If `bd` does not export after a pull, the console shows the out-of-date note from [Beads export](#beads-export).

Pulls run as the console's user:

- The systemd user service has no SSH agent. A `git+ssh` remote needs an SSH key without a passphrase, and the remote's host in `~/.ssh/known_hosts`.
- The Docker image has no SSH client or key, so pulls from SSH remotes fail there with ssh's message.

---

## Reports

`/reports` opens `/reports/status` for the active (or latest) milestone. Five sections share a single scope picker in the header — either a dated milestone or a rolling period (**Last 7 days**, **Last 30 days**, or **Last 90 days**) — and keep that scope when you move between sections:

- **Status** (`/reports/status`): Milestone status brief with a verdict and summary sentence, five headline figures (beads, points, pace, blocked, rework) with week-ago changes, a daily burn-up chart, post-kickoff scope changes (added/removed epics, new estimates, re-estimates, and bugs), **Risks** (longest-waiting blocked beads including blocked chains, plus unestimated epics), and the epic table with planned and forecast dates.
- **Team** (`/reports/team`): Team KPI v2 with team and per-member delivery, **Points delivered** (shared across contributors by closed tracks), **Estimate accuracy** (planned vs. actual days per point), an unassigned-scope note whenever 20% or more of closed beads have no assignee, and an **Across milestones** trend table.
- **Delivery** (`/reports/delivery`): Closed beads, weekly throughput, and cycle time for the chosen milestone or period.
- **Velocity** (`/reports/velocity`): Story-point velocity and milestone completion forecast.
- **Rework** (`/reports/rework`): Reopens (from `.beads/interactions.jsonl`) and `discovered-from` bugs. Legacy links such as `/reports?tab=quality&days=7` redirect to `/reports/rework?days=7`.

---

## Requirements

The Requirements page covers a project whose gin-workflow layout is `sdd`. It needs a gin-workflow with `gin specs trace --all`; with an older one it says so. It reads:

- `gin specs trace --all` and `gin specs reqs`, kept for 60 seconds or until **Refresh data**.
- The Markdown files of the change folders in `docs/changes` and `docs/changes/archive`.
- The asset folders `docs/specs/<capability>/assets/<YYYY-MM-DD>/` whose `description.md` has `Confirmed: <YYYY-MM-DD>`, and the `Source:` lines of `docs/specs/<capability>/spec.md` to name the requirements that use them.

A folder that is a symbolic link is left out, and so is a file link that leads out of its folder. Mockups run isolated from the console: scripts work, but calls, forms, frames, storage and module scripts may not. See [ADR 0004](docs/adr/0004-serve-project-files.md).

---

## Development Mode

For active frontend and backend development with hot reloading:

1. **Start the backend server:**
   ```bash
   uv run --directory backend -m uvicorn gin_console.app:create_app --factory --reload --port 8700
   ```
2. **Start the Vite frontend dev server:**
   ```bash
   cd frontend
   pnpm dev
   ```
   Vite runs on `http://localhost:5173` and proxies `/api` calls to the backend on `http://127.0.0.1:8700`.

---

## Running Tests

### Backend Tests (pytest & typecheck)

```bash
# Run test suite
uv run --directory backend pytest

# Code style and type checking
uv run --directory backend ruff check .
uv run --directory backend mypy
```

### Frontend Tests (vitest & lint)

```bash
# Run unit tests
pnpm -C frontend test

# Type checking and lint
pnpm -C frontend typecheck
pnpm -C frontend lint
```

---

## License

MIT
