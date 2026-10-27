# gin-console

A web-based dashboard and observability console for [gin-workflow](https://github.com/giangdhwhtbr/gin-workflow) projects, [Beads](https://github.com/gastownhall/beads) issue tracking, active AI agent sessions, and AI CLI quotas.

---

## Features

- **Project Dashboard**: Real-time project overview, git branch status, active workflow stages, and running agent counts.
- **Native Beads Explorer**: Interactive Kanban board, hierarchical list, and visual dependency graph with multi-select filtering across status, issue type, priority, assignee, sprint, and labels.
- **AI CLI Quota Tracker**: Monitored usage windows, 5-hour rolling limits, and rate-limit headroom for Claude Code and OpenAI Codex.
- **Session Inspector**: Process liveness detection, active prompt monitoring, and session metrics.
- **Cross-Platform**: First-class support for Linux, macOS, and native Windows (no WSL required).

---

## Prerequisites

Before installing, ensure the following are installed on your machine:

- **Python 3.12+**
- [**uv**](https://docs.astral.sh/uv/) (recommended fast Python package manager)
- **Node.js (v20+ or v22+)** and [**pnpm**](https://pnpm.io/)
- **Git** (on Windows, **Git for Windows** is required)
- [**bd** (Beads CLI)](https://github.com/gastownhall/beads) in your system `PATH`
- *(Optional)* AI CLIs:
  - Claude Code: `npm install -g @anthropic-ai/claude-code`
  - OpenAI Codex: `npm install -g @openai/codex`

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

> **Note on Git for Windows**: Ensure Git for Windows is installed (default path: `C:\Program Files\Git\bin\bash.exe`). The console automatically invokes `bash.exe` to run `gin-workflow` scripts on Windows.

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

- **CLI Wrapper**: A helper script is provided at `scripts\gin-workflow.cmd` if you want to invoke `gin-workflow` directly from CMD or PowerShell.
- **Process Management**: On Windows, quota process termination uses `taskkill` and session liveness checks use Windows `OpenProcess` API.
- **Custom Config Location**: To use a custom configuration file path, set the `GIN_CONSOLE_CONFIG` environment variable:
  ```powershell
  $env:GIN_CONSOLE_CONFIG = "C:\path\to\config.yaml"
  uv run --directory backend -m gin_console
  ```

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
pnpm -C frontend check
pnpm -C frontend lint
```

---

## License

MIT
