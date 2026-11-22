# TC-REPORTS-061: Open after the end date

- **REQ:** REQ-REPORTS-013@5683bbdb
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 3d4717f5

**Preconditions:**
- Project `alpha` has an open milestone `m2` that ended yesterday
- The team report for `m2` answers `late_open` 4

**Test data:**
- None

**Steps:**
1. Open `/reports?project=alpha&tab=team&milestone=m2`
2. Look at the On time figure

**Expected:**
- On time reads "4 open after the end date"
- The line is in the warning color
