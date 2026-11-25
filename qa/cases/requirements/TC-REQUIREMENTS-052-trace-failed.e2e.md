# TC-REQUIREMENTS-052: Trace failed

- **REQ:** REQ-REQUIREMENTS-016@d54e56e6
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-32-34
- **Checked:** 1e49b5d3

**Preconditions:**
- The list of changes has the trace error

**Steps:**
1. Open `/requirements/changes?project=a`

**Expected:**
- The changes are listed
- Sign-offs read "Unknown"
- The error is shown
