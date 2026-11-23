# TC-UI-315: Board card shows data without chips

- **REQ:** REQ-UI-140@aa5bbea9
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** fd871d37

**Preconditions:**
- Project `P` reports an in-progress P2 epic `e-6` with `points: 8` and the kind `technical`

**Steps:**
1. Open `/beads?project=P&view=board`
2. Find the card of `e-6`
3. Read the computed border and background of its facts

**Expected:**
- The card shows "P2" in the muted colour, "Technical" and "8 pt" as text
- No fact on the card has a border or a background colour
