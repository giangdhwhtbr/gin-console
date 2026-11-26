# TC-REPORTS-098: Open bugs list

- **REQ:** REQ-REPORTS-042@a4436ebc
- **Priority:** medium

**Preconditions:**
- Project `alpha` with `today` 2026-11-25
- A P2 bug created 2026-10-13 and deferred, a P1 and a P3 bug created 2026-11-22, and a closed bug

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/bugs?project=alpha&days=7`
2. Send `GET /api/reports/bugs?project=alpha&days=90`

**Expected:**
- In both answers `open` is the bug of 2026-10-13 with `age_days` 43, then the P1 and the P3 bug with 3 (the P1 first), and not the closed bug
- Each entry has `id`, `title`, `priority`, `assignee`, `age_days` and `epic`
