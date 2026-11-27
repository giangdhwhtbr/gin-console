# TC-QA-018: Requirements of the milestone

- **REQ:** REQ-QA-007@02d6aa4e
- **Priority:** high

**Preconditions:**
- Milestone `m2` with epics `e1` and `e2`, `REQ-UI-001` added by `e1`, `REQ-UI-002` modified by `e2` in an archived change, `REQ-UI-003` modified by `e9` of another milestone, and `REQ-UI-004` added by `e1` and since removed
- The cases `TC-UI-001` (lists `REQ-UI-001`), `TC-UI-002` (lists `REQ-UI-002`) and `TC-UI-003` (lists `REQ-UI-003`)

**Steps:**
1. Send `GET /api/qa/readiness/alpha/m2`

**Expected:**
- The requirements of the checklist are `REQ-UI-001` and `REQ-UI-002` only
- The cases it takes into account are `TC-UI-001` and `TC-UI-002`, not `TC-UI-003`
