# TC-REQUIREMENTS-045: Removed

- **REQ:** REQ-REQUIREMENTS-013@ae9a08c0
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-32-34
- **Checked:** d6702917

**Preconditions:**
- One requirement is removed

**Steps:**
1. Open `/requirements/matrix?project=a`
2. Turn on "Show removed"

**Expected:**
- The removed requirement is listed and reads "Removed" instead of a status
- The status counts do not change
