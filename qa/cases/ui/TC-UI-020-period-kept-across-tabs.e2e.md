# TC-UI-020: Period kept across tabs

- **REQ:** REQ-UI-088@ed9bddcf
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 2034ff7f

**Preconditions:**
- The Reports page for `alpha` with 7 days picked on the Delivery tab
- The window is 900px wide, so the sidebar lists no report sections and the page shows its tab list

**Test data:**
- None

**Steps:**
1. Select the Team tab
2. Select the Quality tab

**Expected:**
- 7 days is selected in the Quality panel
