# TC-BEADS-014: Refresh drops the snapshot and the report cache

- **REQ:** REQ-BEADS-012@1a1b7a68
- **Priority:** high

**Preconditions:**
- Project P whose snapshot is current and a report of P cached less than 60 seconds ago
- The `bd` command is replaced by a fake that records every call and exits 0 for `bd dolt pull`

**Steps:**
1. Send `POST /api/refresh`
2. Request the list of P
3. Request the report of P

**Expected:**
- P was pulled before the response (the fake recorded one `bd dolt pull` in P's directory)
- The refresh response is 204
- The file was read again
- The report was built again
