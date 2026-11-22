# TC-UI-152: Hidden tabs are hinted

- **REQ:** REQ-UI-095@c32236ad
- **Priority:** medium

**Preconditions:**
- Project `alpha` exists
- The Data coverage tab does not fit in a 768 px window
- The sidebar shows the icon rail at this width, so the page shows its tab list

**Steps:**
1. Set the window width to 768 px
2. Open `/reports?project=alpha&tab=team`
3. Scroll the tab list to its end

**Expected:**
- After step 2, the right edge of the tab list fades
- After step 3, the right fade is gone and a left fade is shown
