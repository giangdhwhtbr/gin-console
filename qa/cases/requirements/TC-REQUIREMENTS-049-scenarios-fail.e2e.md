# TC-REQUIREMENTS-049: Scenarios fail

- **REQ:** REQ-REQUIREMENTS-015@6c158555
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-25-28
- **Checked:** 7460fa9f

**Preconditions:**
- The scenarios request answers 502

**Steps:**
1. Open `/requirements/matrix?project=a&req=REQ-AUTH-001`

**Expected:**
- The panel says the scenarios could not be loaded
- It lists the beads and the cases
