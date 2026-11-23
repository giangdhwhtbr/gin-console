# TC-UI-307: Prep tasks are shown apart from the strand

- **REQ:** REQ-UI-138@b0819958
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 1a6750a8

**Preconditions:**
- Project `P` reports epic `e-4` with tracks `t-1` (closed) and `t-2` (open), and the open prep task `p-1` labelled `prep`

**Steps:**
1. Open `/beads?project=P&view=list`
2. Find the row of `e-4`

**Expected:**
- The row shows a strand of 2 beads
- The strand is followed by "1/2"
- After the strand the row shows the text "Prep 0/1"
