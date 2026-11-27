# TC-QA-010: Failed case with its bug

- **REQ:** REQ-QA-004@e383217d
- **Priority:** high

**Preconditions:**
- Case `TC-UI-115` with effective result `failed` and `bug` `gin-console-3kd`, an open P1 bead of the project

**Steps:**
1. Send `GET /api/qa/cases/alpha/TC-UI-115`

**Expected:**
- `bug` is `{id: "gin-console-3kd", title: …, status: "open", priority: 1}`
- The steps, preconditions and expected results of the case are listed
