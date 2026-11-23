# TC-REPORTS-041: No milestones

- **REQ:** REQ-REPORTS-017@94b4aefa
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** abdf0ca6

**Preconditions:**
- The team report of `beta` has no milestones

**Test data:**
- None

**Steps:**
1. Open `/reports?project=beta&tab=team`

**Expected:**
- It says "beta has no milestones yet" and offers to copy `gin milestone create`
