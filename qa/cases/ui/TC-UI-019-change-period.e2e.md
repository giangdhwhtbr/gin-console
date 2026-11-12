# TC-UI-019: Change period

- **REQ:** REQ-UI-088@a924faa8
- **Priority:** medium

**Preconditions:**
- The Reports page for `alpha`, 30 days and the Delivery tab

**Test data:**
- None

**Steps:**
1. The user picks 90 days

**Expected:**
- The URL becomes `/reports?project=alpha&days=90&tab=delivery` without a reload and the report is requested again
