# TC-QA-002: Unknown result and new keys

- **REQ:** REQ-QA-001@3cad0dd3
- **Priority:** medium

**Preconditions:**
- An export whose case `TC-UI-003` has `effective_result` `skipped` and a key `flaky` the console does not know

**Steps:**
1. Send `GET /api/qa/cases?project=alpha`

**Expected:**
- The response is 200
- `TC-UI-003` has `effective_result` `skipped`, has no `flaky` key and is counted under `other`
