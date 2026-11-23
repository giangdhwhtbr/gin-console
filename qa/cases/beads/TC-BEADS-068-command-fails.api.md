# TC-BEADS-068: Command fails

- **REQ:** REQ-BEADS-020@b0eb251f
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-46-49-api
- **Checked:** 6725a783

**Preconditions:**
- Project `p` has epic `e-1`
- `gin state --workflow-id e-1 --format json` exits non-zero with "unknown workflow"

**Test data:**
- None

**Steps:**
1. Send `GET /api/beads/p/e-1/workflow`
2. Send the same request again

**Expected:**
- The answer to step 1 is 502 with an `error` naming the failure
- The command runs again for step 2, so the failure is not cached
