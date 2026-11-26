# TC-UI-152: Hidden tabs are hinted

- **REQ:** REQ-UI-095@3fd9927e
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 48715ae4

**Preconditions:**
- Project `alpha` exists
- Bugs does not fit in a 360 px window
- The sidebar shows the icon rail at this width, so the page shows its row of section links

**Steps:**
1. Set the window width to 360 px
2. Open `/reports/status?project=alpha`
3. Scroll the row of section links to its end

**Expected:**
- After step 2, the right edge of the row fades
- After step 3, the right fade is gone and a left fade is shown
