# TC-DOCKER-002: Shared config and project paths in the container

- **REQ:** REQ-DOCKER-003@ec1a654a
- **Priority:** medium

**Preconditions:**
- The compose stack is running with `~/.config/gin-console/config.yaml`, which lists a project path such as `/home/gin/qwikfone`
- The systemd service uses the same file

**Steps:**
1. Run `docker compose exec -T gin-console test -d /home/gin/qwikfone` (`scripts/docker-smoke.sh` has no check for this path; it only finds a mounted project with a `.beads` directory under `$HOME`)
2. Open `http://127.0.0.1:8700/` in the container and open the project switcher
3. Open the same address of the systemd service and open its project switcher

**Expected:**
- The directory exists inside the container
- The switcher of the container lists the project
- Both switchers list the same projects
