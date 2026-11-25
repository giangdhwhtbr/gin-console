# TC-UI-321: Closed beads hidden

- **REQ:** REQ-UI-101@643e2f00
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 03d15925

**Preconditions:**
- Project A has 3 open (ready) and 2 closed beads assigned to the user

**Steps:**
1. Open `/my-tasks?project=A`

**Expected:**
- The "Assigned to me" group holds 3
- There is no "Closed" group
- No beads request has `closed=1`
