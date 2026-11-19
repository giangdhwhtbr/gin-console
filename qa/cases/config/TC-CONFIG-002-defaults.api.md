# TC-CONFIG-002: Defaults

- **REQ:** REQ-CONFIG-006@de736f94
- **Priority:** medium

**Preconditions:**
- Config text with projects and no `beads` section and no `pull` key on any project

**Steps:**
1. Load the config and start the console
2. Send `POST /api/refresh`

**Expected:**
- There is no scheduled pull
- Every project is pulled on refresh
