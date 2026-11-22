# TC-UI-152: Hidden tabs are hinted

- **REQ:** REQ-UI-095@1912887f
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T08-56-47
- **Checked:** dfaf38a5

**Preconditions:**
- Project `alpha` exists
- The Quality tab does not fit in a 360 px window
- The sidebar shows the icon rail at this width, so the page shows its tab list

**Steps:**
1. Set the window width to 360 px
2. Open `/reports?project=alpha&tab=team`
3. Scroll the tab list to its end

**Expected:**
- After step 2, the right edge of the tab list fades
- After step 3, the right fade is gone and a left fade is shown
