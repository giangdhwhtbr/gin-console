# TC-UI-321: Closed beads hidden

- **REQ:** REQ-UI-101@3ebbeeeb
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 03d15925

**Preconditions:**
- Project A has 3 open and 2 closed beads assigned to the user

**Steps:**
1. Open `/my-tasks?project=A`

**Expected:**
- 3 beads are listed
- No beads request has `closed=1`
