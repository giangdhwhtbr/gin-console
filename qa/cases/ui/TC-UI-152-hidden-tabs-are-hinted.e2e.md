# TC-UI-152: Hidden tabs are hinted

- **REQ:** REQ-UI-095@bf1627ff
- **Priority:** medium

**Preconditions:**
- Project `alpha` exists
- The window is 768 px wide, so the Data coverage tab does not fit

**Steps:**
1. Set the window width to 768 px
2. Open `/reports?project=alpha&tab=team`
3. Scroll the tab list to its end

**Expected:**
- After step 2, the right edge of the tab list fades
- After step 3, the right fade is gone and a left fade is shown
