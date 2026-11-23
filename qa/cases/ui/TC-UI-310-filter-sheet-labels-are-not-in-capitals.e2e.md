# TC-UI-310: Filter sheet labels are not in capitals

- **REQ:** REQ-UI-139@fbddf5e1
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 2032ffb2

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
