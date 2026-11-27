# TC-QA-006: Hidden project

- **REQ:** REQ-QA-002@a7a439ce
- **Priority:** high

**Preconditions:**
- Auth is on and user `bao` may see only `beta`; projects `alpha` and `beta` are configured

**Steps:**
1. Sign in as `bao`
2. Send `GET /api/qa/cases?project=alpha`
3. Send `GET /api/qa/cases/alpha/TC-UI-001`
4. Send `GET /api/qa/readiness/alpha/m2`

**Expected:**
- Every response is 404
- `gin-qa` did not run
