# TC-UI-219: No extra history entry

- **REQ:** REQ-UI-075@b0eb7f1a
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 9a936e4d

**Preconditions:**
- Project `p` has epic `e-1`

**Steps:**
1. Open `/beads/p/e-1`
2. Open `/beads/p/graph`
3. Press the browser's back button

**Expected:**
- After step 2 `/beads?project=p&view=graph` is shown
- After step 3 `/beads/p/e-1` is shown, not the old link
