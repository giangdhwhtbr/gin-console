# TC-MILESTONE-UI-088: Schedule facts

- **REQ:** REQ-MILESTONE-UI-008@d38e632d
- **Priority:** medium

**Preconditions:**
- Project `P` whose `milestone show M1` prints `integration: 2026-11-24`, `deadline: null`, `away: {"ann": ["2026-11-18"]}` and an epic with `remaining_days: 2` and `assumed_days: null`

**Test data:**
- None

**Steps:**
1. Request `GET /api/milestones/P/M1`

**Expected:**
- The response carries those values unchanged
