# TC-BEADS-072: Same blocked number in the summary and in the Beads views

- **REQ:** REQ-BEADS-021@23b392e1
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** cede5b93

**Preconditions:**
- Project `alpha` as in TC-BEADS-071: beads `a`, `e`, `e.1`, `b`, `c` and `d` give 4 blocked beads and 1 in-progress bead
- The browser holds the email `qa@example.com` in localStorage under `gin-console.email`

**Test data:**
- None

**Steps:**
1. Open `/beads?project=alpha&view=board`
2. Open `/beads?project=alpha&view=focus`

**Expected:**
- After step 1, the Blocked column of the Board says 4
- After step 2, the Blocked column of the Focus view says 4
