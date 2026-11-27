# TC-QA-014: No run here

- **REQ:** REQ-QA-005@2750cd36
- **Priority:** high

**Preconditions:**
- Case `TC-UI-120` with an empty `run`, case `TC-UI-121` whose run folder was deleted, and api case `TC-SERVER-001` whose run folder has no `tc-server-001/result.json`

**Steps:**
1. Send `GET /api/qa/cases/alpha/TC-UI-120`
2. Send `GET /api/qa/cases/alpha/TC-UI-121`
3. Send `GET /api/qa/cases/alpha/TC-SERVER-001`

**Expected:**
- `latest_run` is `null` with the reasons `no_run`, `not_on_host` and `not_on_host`
