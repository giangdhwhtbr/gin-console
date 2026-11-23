# TC-UI-026: Unknown tab

- **REQ:** REQ-UI-095@78603446
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 710f7dcb

**Preconditions:**
- The URL `/reports?project=alpha&tab=nope`
- The window is 900px wide, so the sidebar lists no report sections and the page shows its tab list

**Test data:**
- None

**Steps:**
1. Open `/reports?project=alpha&tab=nope`

**Expected:**
- The Team tab is selected
