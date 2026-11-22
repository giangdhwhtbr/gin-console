# TC-UI-299: Every type on the bead page

- **REQ:** REQ-UI-067@e9f2261b
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 1245369a

**Preconditions:**
- Project `P` reports a feature `p-f` titled "A feature"

**Steps:**
1. Open `/beads/P/p-f`
2. Read the line of facts of the bead page

**Expected:**
- The facts show Type "feature" as plain text without a border or a tint
