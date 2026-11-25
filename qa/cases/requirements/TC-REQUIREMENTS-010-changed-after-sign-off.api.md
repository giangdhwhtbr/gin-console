# TC-REQUIREMENTS-010: Changed after sign-off

- **REQ:** REQ-REQUIREMENTS-003@f6da60b3
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-33-21-api
- **Checked:** 17afaab8

**Preconditions:**
- A requirement has a sign-off by `ba` whose `current` is false

**Steps:**
1. Send `GET /api/requirements?project=proj`

**Expected:**
- The sign-off state is `changed`
- It carries the actor, the time and the change
