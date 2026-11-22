# TC-UI-310: Filter sheet labels are not in capitals

- **REQ:** REQ-UI-139@4e59801c
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 52438508

**Preconditions:**
- Project `P` reports at least one bead
- The window is 390px wide

**Steps:**
1. Open `/beads?project=P&view=list`
2. Open the filter sheet
3. Read the computed `text-transform` of each section label

**Expected:**
- The section labels read "Status", "Priority" and "Labels", each in sentence case
- No label has `text-transform: uppercase`
