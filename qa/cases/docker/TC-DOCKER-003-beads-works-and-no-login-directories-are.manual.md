# TC-DOCKER-003: Beads works and no login directories are mounted

- **REQ:** REQ-DOCKER-004@2b1263cc
- **Priority:** high

**Preconditions:**
- The compose stack was started from the compose file, with a project that has a `.beads` directory mounted

**Steps:**
1. Run `scripts/docker-smoke.sh` (its REQ-DOCKER-003 / REQ-DOCKER-004 checks run `bd list` against the mounted project, and `test -e "$HOME/.claude"` and `test -e "$HOME/.codex"` in the container)

**Expected:**
- `bd list` succeeds without a lock error
- `test -e "$HOME/.claude"` and `test -e "$HOME/.codex"` each exit non-zero, so the script does not report "a login directory is mounted"
- The script ends with `docker smoke: ok`
