# TC-UI-314: List row shows data without chips

- **REQ:** REQ-UI-140@f52fcd4d
- **Priority:** high

**Preconditions:**
- Project `P` reports a blocked P1 bug `b-1` assigned to alice with the labels `area:backend` and `ui`, the lane `be` and 2 comments
- The window is 1440px wide

**Steps:**
1. Open `/beads?project=P&view=list`
2. Find the row of `b-1`
3. Read the computed border and background of each fact on the row

**Expected:**
- The row shows "bug" in the carnelian of the theme, "P1" in bold, "area:backend", "ui", a muted dot followed by "be", and a comment icon with "2"
- None of these has a border or a background colour
