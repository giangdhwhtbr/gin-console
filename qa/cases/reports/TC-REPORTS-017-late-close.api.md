# TC-REPORTS-017: Late close

- **REQ:** REQ-REPORTS-009@522708e2
- **Priority:** medium

**Preconditions:**
- Milestone `m2` ending on Friday 2026-11-27 and a scope bead closed on Tuesday 2026-12-01

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha&milestone=m2`

**Expected:**
- Its `late_days` is 2
