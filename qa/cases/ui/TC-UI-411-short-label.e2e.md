# TC-UI-411: Short label

- **REQ:** REQ-UI-055@e9a2cf05
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-26T02-30-19
- **Checked:** f2058961

**Preconditions:**
- Project `a` is configured

**Steps:**
1. Set the window to 390px wide and open `/my-tasks?project=a`
2. Set the window to 820px wide
3. Set the window to 1440px wide

**Expected:**
- At 390px and 820px the Requirements link shows "REQs", its accessible name is "REQs (Requirements)" and no label is cut off or overlaps another
- At 1440px its accessible name is "Requirements"
