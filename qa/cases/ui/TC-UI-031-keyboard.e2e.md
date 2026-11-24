# TC-UI-031: Keyboard

- **REQ:** REQ-UI-095@c0140122
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 909c819f

**Preconditions:**
- The Delivery link in "Report sections" is current (`aria-current="page"`) and has focus
- The window is 900px wide, so the sidebar lists no report sections and the page shows its row of section links

**Test data:**
- None

**Steps:**
1. Press Tab
2. Press Enter

**Expected:**
- Velocity has focus after step 1
- After step 2, `/reports/velocity` is shown and Velocity is marked `aria-current="page"`
