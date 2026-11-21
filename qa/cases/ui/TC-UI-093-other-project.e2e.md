# TC-UI-093: Other project

- **REQ:** REQ-UI-073@99c2938a
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-18T15-52-57

**Preconditions:**
- Projects `a` and `b`, each with a bead; the Beads page of project `a` was shown last

**Steps:**
1. Open `/beads?project=a`
2. Open the bead page of a bead of project `b`

**Expected:**
- The first link of the breadcrumb goes to `/beads?project=b`
