# TC-UI-322: Show closed on My Tasks

- **REQ:** REQ-UI-101@3ebbeeeb
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 5027c9d6

**Preconditions:**
- Project A has 3 open and 2 closed beads assigned to the user

**Steps:**
1. Open `/my-tasks?project=A`
2. Turn on "Show closed"

**Expected:**
- The URL is `/my-tasks?project=A&closed=1`
- The beads are requested with `closed=1`
- 5 beads are listed
