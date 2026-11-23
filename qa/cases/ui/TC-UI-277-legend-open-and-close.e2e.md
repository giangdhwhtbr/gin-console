# TC-UI-277: Legend open and close

- **REQ:** REQ-UI-133@501caec3
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 5f2269a7

**Preconditions:**
- Project `alpha` has beads

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=list`
2. Activate "Legend"
3. Press Escape

**Expected:**
- After step 2 the panel lists the five state glyphs, the strand and the meaning of blocked, done and progress
- After step 3 the panel is closed and the focus is on "Legend"
