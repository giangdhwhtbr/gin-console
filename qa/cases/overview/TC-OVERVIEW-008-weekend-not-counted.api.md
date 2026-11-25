# TC-OVERVIEW-008: Weekend not counted

- **REQ:** REQ-OVERVIEW-003@d8277076
- **Priority:** medium

**Preconditions:**
- `overview.aging_days` is 3
- An in-progress bead started on Thursday 19 Nov 2026; today is Tuesday 24 Nov 2026

**Steps:**
1. Request `GET /api/overview`

**Expected:**
- The bead has waited 3 working days and is not in `aging`
