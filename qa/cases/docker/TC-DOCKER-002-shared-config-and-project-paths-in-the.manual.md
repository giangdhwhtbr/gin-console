# TC-DOCKER-002: Shared config and project paths in the container

- **REQ:** REQ-DOCKER-003@b80d25eb
- **Priority:** medium

**Preconditions:**
- The compose stack is running with `~/.config/gin-console/config.yaml`, which lists a project path such as `/home/gin/qwikfone`
- The systemd service uses the same file

**Steps:**
1. Run `docker compose exec -T gin-console test -d /home/gin/qwikfone` (`scripts/docker-smoke.sh` has no check for this path; it only finds a mounted project with a `.beads` directory under `$HOME`)
2. Open the Projects page of the container at `http://127.0.0.1:8700/`
3. Open the Projects page of the systemd service

**Expected:**
- The directory exists inside the container
- The Projects page lists the project without a "missing" badge
- Both pages show the same project list
