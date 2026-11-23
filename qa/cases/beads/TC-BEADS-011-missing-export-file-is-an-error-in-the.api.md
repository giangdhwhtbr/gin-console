# TC-BEADS-011: Missing export file is an error in the projects block

- **REQ:** REQ-BEADS-005@82adf461
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-46-49-api
- **Checked:** 5888db19

**Preconditions:**
- Project P whose `.beads` has no `issues.jsonl`

**Steps:**
1. Request `GET /api/projects/beads`

**Expected:**
- The response is 200
- The `beads` of P is `{"error": "<the message of the list request>"}`
- The other projects of the answer keep their counts
