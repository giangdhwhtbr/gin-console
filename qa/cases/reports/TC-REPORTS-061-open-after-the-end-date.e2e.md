# TC-REPORTS-061: Open after the end date

- **REQ:** REQ-REPORTS-013@5ea0d567
- **Priority:** medium

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
