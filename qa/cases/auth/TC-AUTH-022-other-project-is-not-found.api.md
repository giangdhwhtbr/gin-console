# TC-AUTH-022: Other project is not found

- **REQ:** REQ-AUTH-007@e145510c
- **Priority:** high

**Preconditions:**
- Projects `a` and `b`; user `an` with projects `[a]`

**Steps:**
1. Request `GET /api/beads?project=b`
2. Request `GET /api/milestones/b/wbs?format=csv`
3. Request `GET /api/reports?project=b`

**Expected:**
- Each answers 404, the same as an unknown project
