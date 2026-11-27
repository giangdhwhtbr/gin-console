# TC-QA-015: Refused run

- **REQ:** REQ-QA-005@2750cd36
- **Priority:** high

**Preconditions:**
- Case `TC-UI-122` with `run` `../outside/r1`, and case `TC-UI-123` whose `result.json` names the screenshot `../../secret.png`

**Steps:**
1. Send `GET /api/qa/cases/alpha/TC-UI-122`
2. Send `GET /api/qa/cases/alpha/TC-UI-123`

**Expected:**
- `TC-UI-122` has `latest_run` `null` with the reason `invalid`
- The step of `TC-UI-123` has `screenshot` false
