# TC-SERVER-015: No workflow on epics

- **REQ:** REQ-SERVER-006@ec9c5c6d
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-26T14-14-56-api
- **Checked:** 3ac0984c

**Preconditions:**
- Project `alpha` has in_progress epic `e-1` and ready epic `e-2`
- The `gin` command is replaced by a fake that records every call

**Test data:**
- None

**Steps:**
1. Send `GET /api/projects/beads`

**Expected:**
- `e-1` has `id`, `title` and `status` `in_progress` and no `workflow`
- `e-2` has `status` `open` and no `workflow`
- The fake `gin` recorded no call
