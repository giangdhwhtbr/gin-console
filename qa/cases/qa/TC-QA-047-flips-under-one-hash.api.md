# TC-QA-047: Flips under one hash

- **REQ:** REQ-QA-016@624437c8
- **Priority:** medium

**Preconditions:**
- `TC-UI-001` ran passed, failed, passed with `hash8` `aaaa1111`
- `TC-UI-002` ran failed with `aaaa2222` then passed with `bbbb2222`

**Steps:**
1. Send `GET /api/qa/trends/alpha`

**Expected:**
- `flaky` holds `TC-UI-001` with `flips` 2 and `last_result` `passed`
- `flaky` does not hold `TC-UI-002`
