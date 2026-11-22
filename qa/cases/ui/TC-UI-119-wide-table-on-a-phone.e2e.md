# TC-UI-119: Wide table on a phone

- **REQ:** REQ-UI-107@99b7498f
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-49-44
- **Checked:** 6967c8eb

**Preconditions:**
- Project `alpha` has bead `t-1` whose description holds a table with five wide columns and a long code line
- The browser window is 390px wide

**Steps:**
1. Open `/beads/alpha/t-1`

**Expected:**
- The table and the code block scroll inside their own boxes
- The page does not scroll sideways
