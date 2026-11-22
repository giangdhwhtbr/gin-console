# TC-BEADS-072: Same blocked number on Projects and in the Beads views

- **REQ:** REQ-BEADS-021@6fc8f7d7
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** a7822786

**Preconditions:**
- Project `alpha` as in TC-BEADS-071: beads `a`, `e`, `e.1`, `b`, `c` and `d` give 4 blocked beads and 1 in-progress bead
- The browser holds the email `qa@example.com` in localStorage under `gin-console.email`

**Test data:**
- None

**Steps:**
1. Open `/`
2. Open `/beads?project=alpha&view=board`
3. Open `/beads?project=alpha&view=focus`

**Expected:**
- After step 1, the card of `alpha` reads "blocked 4"
- After step 2, the Blocked column of the Board says 4
- After step 3, the Blocked column of the Focus view says 4
