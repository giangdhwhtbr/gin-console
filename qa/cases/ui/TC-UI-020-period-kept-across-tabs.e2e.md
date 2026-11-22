# TC-UI-020: Period kept across tabs

- **REQ:** REQ-UI-088@086b0a47
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T08-56-47
- **Checked:** 61848b8a

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
