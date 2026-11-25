# TC-UI-093: Other project

- **REQ:** REQ-UI-073@9e85a65b
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 52cda7cd

**Preconditions:**
- Projects `a` and `b`, each with a bead; the Beads page of project `a` was shown last

**Steps:**
1. Open `/beads?project=a`
2. Open the bead page of a bead of project `b`

**Expected:**
- The first link of the breadcrumb goes to `/beads?project=b`
