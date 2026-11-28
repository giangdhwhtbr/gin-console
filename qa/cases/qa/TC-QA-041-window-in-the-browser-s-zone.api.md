# TC-QA-041: Window in the browser's zone

- **REQ:** REQ-QA-014@d76a7cda
- **Priority:** medium

**Preconditions:**
- Today is 2026-11-28 in `Asia/Ho_Chi_Minh`
- Project `alpha` has runs at `2026-11-21T16:59:59Z` and `2026-11-21T17:00:00Z`

**Steps:**
1. Send `GET /api/qa/trends/alpha?days=7&tz=Asia/Ho_Chi_Minh`

**Expected:**
- gin-qa ran with `--since 2026-11-21`
- `days` lists 2026-11-22 to 2026-11-28
- Only the run at `17:00:00Z` counts
