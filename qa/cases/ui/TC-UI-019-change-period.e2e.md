# TC-UI-019: Change period

- **REQ:** REQ-UI-088@e23f9c54
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** a27bbc06

**Preconditions:**
- The Reports page for `alpha`, 30 days and the Delivery section (`/reports/delivery?project=alpha&days=30`)

**Test data:**
- None

**Steps:**
1. Pick "Last 90 days" in the scope select

**Expected:**
- The URL becomes `/reports/delivery?project=alpha&days=90` without a reload and the report is requested again
