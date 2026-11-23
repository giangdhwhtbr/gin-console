# TC-UI-019: Change period

- **REQ:** REQ-UI-088@ed9bddcf
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** a27bbc06

**Preconditions:**
- The Reports page for `alpha`, 30 days and the Delivery tab

**Test data:**
- None

**Steps:**
1. Pick 90 days

**Expected:**
- The URL becomes `/reports?project=alpha&days=90&tab=delivery` without a reload and the report is requested again
