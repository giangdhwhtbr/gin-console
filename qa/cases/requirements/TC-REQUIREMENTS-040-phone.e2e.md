# TC-REQUIREMENTS-040: Phone

- **REQ:** REQ-REQUIREMENTS-012@947360b0
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-25-28
- **Checked:** f31492de

**Preconditions:**
- Project `a` is configured

**Steps:**
1. Set the window to 390px wide
2. Open `/requirements/changes?project=a`
3. Set the window to 360px wide

**Expected:**
- The row of section links "Requirement sections" is shown with Changes current
- The page does not scroll sideways at 390px and at 360px
