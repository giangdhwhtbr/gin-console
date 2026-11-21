# TC-DOCKER-004: Pinned versions and no secret in layers

- **REQ:** REQ-DOCKER-006@2b59b619
- **Priority:** medium

**Preconditions:**
- No build args are overridden
- A git secret is available for a build

**Steps:**
1. Build the image twice with `docker compose build`
2. Run `uv --version`, `git --version`, `bd --version` and `gin --version` in a container of each build (`scripts/docker-smoke.sh` runs this check on a running stack)
3. Build the image with a git secret
4. Run `docker history` on the image and search the image filesystem for the secret value

**Expected:**
- Both builds report the same tool versions
- The secret value is not present in the history or the filesystem
