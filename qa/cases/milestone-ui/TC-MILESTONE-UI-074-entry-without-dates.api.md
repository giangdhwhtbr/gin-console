# TC-MILESTONE-UI-074: Entry without dates

- **REQ:** REQ-MILESTONE-UI-008@d38e632d
- **Priority:** high

**Preconditions:**
- Project `P` whose `milestone list` prints M1 and M4 with `start: null`, `end: null` and `error: "M4 has no start/end metadata"`

**Steps:**
1. Request `GET /api/milestones?project=P`

**Expected:**
- The response is 200
- The body has M1
- The body has M4 with `start: null`, `end: null` and `error: "M4 has no start/end metadata"`
