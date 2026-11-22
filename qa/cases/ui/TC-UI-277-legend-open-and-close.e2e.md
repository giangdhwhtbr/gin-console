# TC-UI-277: Legend open and close

- **REQ:** REQ-UI-133@61468990
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T04-57-11
- **Checked:** 6d64a113

**Preconditions:**
- Project `alpha` has beads

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=list`
2. Activate "Legend"
3. Press Escape

**Expected:**
- After step 2 the panel lists the five state marks and the meaning of blocked, done and progress
- After step 3 the panel is closed and the focus is on "Legend"
