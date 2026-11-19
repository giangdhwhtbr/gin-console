# TC-BEADS-050: Pull every interval

- **REQ:** REQ-BEADS-017@a551ebcb
- **Priority:** high

**Preconditions:**
- The config holds `beads.pull_interval: 5m` and the clock is at the server's start time
- One project is configured; the fake `bd dolt pull` exits 0

**Steps:**
1. Start the server
2. Advance the clock by 5 minutes
3. Request `GET /api/projects/beads`
4. Advance the clock by 5 minutes after that pull ended
5. Request `GET /api/projects/beads`

**Expected:**
- The server pulled twice
- After each pull the next list request read `.beads/issues.jsonl` again
