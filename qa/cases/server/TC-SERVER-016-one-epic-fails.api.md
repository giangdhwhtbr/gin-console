# TC-SERVER-016: Epics of any state carry no workflow

- **REQ:** REQ-SERVER-006@ec9c5c6d
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-26T14-14-56-api
- **Checked:** 0f17ff3b

**Preconditions:**
- Project `alpha` has in_progress epics `e-1` and `e-3`
- The `gin` command is replaced by a fake that exits non-zero for `gin state`

**Test data:**
- None

**Steps:**
1. Send `GET /api/projects/beads`

**Expected:**
- The response is 200
- `e-1` and `e-3` have no `workflow`, not even an `error`
- The fake `gin` recorded no call
- The rest of `alpha` is unchanged
