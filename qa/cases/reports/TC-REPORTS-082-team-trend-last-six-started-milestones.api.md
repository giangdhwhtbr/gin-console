# TC-REPORTS-082: Team trend last six started milestones and unassigned count

- **REQ:** REQ-REPORTS-035@10a8ce75
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-24T03-52-06-api
- **Checked:** 40de9ba2

**Preconditions:**
- Project `alpha` with 8 milestones that started on or before `today` and 1 planned milestone starting after `today`
- Selected milestone has 30 closed scope beads, 8 of them without an assignee

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha`
2. Send `GET /api/reports/team?project=alpha&days=30`

**Expected:**
- In both responses, `trend` holds the 6 latest started milestones, oldest `start` first, and does not include the planned milestone
- In step 1, `unassigned` is `{closed: 8, total: 30}`
