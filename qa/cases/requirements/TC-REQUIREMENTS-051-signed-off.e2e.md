# TC-REQUIREMENTS-051: Signed off

- **REQ:** REQ-REQUIREMENTS-016@d54e56e6
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-25-28
- **Checked:** ffeec555

**Preconditions:**
- An open change is signed off by `ba`; an archived change is not named by the trace

**Steps:**
1. Open `/requirements/changes?project=a`

**Expected:**
- The open change is listed first with its row naming `ba` and the time
- Its epic is a link to the bead
- The archived change reads sign-off "Unknown"
