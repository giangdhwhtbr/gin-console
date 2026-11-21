# TC-DOCKER-001: Required tools and no agent CLIs in the image

- **REQ:** REQ-DOCKER-001@c65699f5
- **Priority:** high

**Preconditions:**
- The image was built with default build args and the compose stack is running (`docker compose up -d`)

**Steps:**
1. Run `scripts/docker-smoke.sh` (its REQ-DOCKER-001 check runs `uv --version`, `git --version`, `bd --version` and `gin --version` in the container, then `command -v claude` and `command -v codex`)
2. Open `http://127.0.0.1:8700/` in a browser

**Expected:**
- The tool versions print and exit 0
- `command -v claude` and `command -v codex` each exit non-zero, so the script does not report "an agent CLI is installed"
- The script ends with `docker smoke: ok`
- `GET /` returns the built frontend
