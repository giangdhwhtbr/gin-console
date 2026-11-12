# TC-REPORTS-012: No process and cache

- **REQ:** REQ-REPORTS-008@969b8165
- **Priority:** medium

**Preconditions:**
- Project `alpha`

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha`
2. Send the same request again 20 seconds later

**Expected:**
- The second response has the same `generated_at` as the first
- No `gin` or `bd` process starts (check with `pgrep`)
