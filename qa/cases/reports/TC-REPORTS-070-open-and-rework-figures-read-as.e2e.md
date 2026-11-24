# TC-REPORTS-070: Open and rework figures read as sentences

- **REQ:** REQ-REPORTS-013@cf4e7ed4
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 390e7f66

**Preconditions:**
- The team report of milestone `m2` has `blocked` 3, `unclaimed` 8, `reopens` 2 and `bugs` 1

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/reports/team?project=alpha&milestone=m2`

**Expected:**
- The Open figure reads "3 blocked, 8 unassigned" in the warning colour
- The Rework figure reads "2 reopens, 1 bug later"
