# TC-BEADS-011: Missing export file is an error in the projects block

- **REQ:** REQ-BEADS-005@b68c592c
- **Priority:** high

**Preconditions:**
- Project P with workflow data whose `.beads` has no `issues.jsonl`

**Steps:**
1. Request `GET /api/projects`

**Expected:**
- The response is 200
- The `beads` of P is `{"error": "<the message of the list request>"}`
- The `workflow` of P has data
