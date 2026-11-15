# TC-MILESTONE-UI-087: Output from an older gin-workflow

- **REQ:** REQ-MILESTONE-UI-008@d38e632d
- **Priority:** medium

**Preconditions:**
- Project `P` whose `milestone list` prints schema 1 without `forecast` and without `lanes`, and whose `milestone show M1` prints no `lanes`

**Test data:**
- None

**Steps:**
1. Request `GET /api/milestones?project=P`
2. Request `GET /api/milestones/P/M1`

**Expected:**
- Both responses are 200
- The list has `forecast: null` and M1 entry `lanes: null`
- M1 has `lanes: null`
