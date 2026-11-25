# TC-REQUIREMENTS-058: Legacy

- **REQ:** REQ-REQUIREMENTS-019@0542c98a
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-25-28
- **Checked:** e407c2a9

**Preconditions:**
- The trace of project `a` has the layout `legacy`

**Steps:**
1. Open `/requirements/matrix?project=a`
2. Open `/requirements/changes?project=a`

**Expected:**
- Each section says the project uses the legacy layout, which has no requirement ids
