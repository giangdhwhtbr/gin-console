# TC-REPORTS-024: Range

- **REQ:** REQ-REPORTS-011@de698801
- **Priority:** medium

**Preconditions:**
- An open milestone from 2026-11-02 to 2026-11-27 and `today` 2026-11-12

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha`

**Expected:**
- `days` has 20 entries, from 2026-11-02 to 2026-11-27
