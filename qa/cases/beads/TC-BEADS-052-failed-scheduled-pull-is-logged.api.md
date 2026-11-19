# TC-BEADS-052: Failed scheduled pull is logged

- **REQ:** REQ-BEADS-017@a551ebcb
- **Priority:** medium

**Preconditions:**
- The config holds `beads.pull_interval: 5m`
- Project A is configured; the fake `bd dolt pull` in A exits 1 with a merge conflict

**Steps:**
1. Start the server
2. Advance the clock by 5 minutes
3. Read the server log
4. Request `GET /api/projects`

**Expected:**
- The server log names A and the error
- A has `pull.status` `error`
