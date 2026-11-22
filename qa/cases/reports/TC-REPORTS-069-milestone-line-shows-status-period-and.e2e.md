# TC-REPORTS-069: Milestone line shows status, period and working days

- **REQ:** REQ-REPORTS-012@023dc4c5
- **Priority:** medium

**Preconditions:**
- Project `alpha` has active milestone `m2` of 16 working days, today being its working day 8, with a forecast `finish` in the Milestones list after its `end`

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/reports?project=alpha&tab=team&milestone=m2`

**Expected:**
- The milestone line shows the title, the status "Active, late" as its glyph and word with a warning mark, "<start> – <end>" and "working day 8 of 16, 8 left"
