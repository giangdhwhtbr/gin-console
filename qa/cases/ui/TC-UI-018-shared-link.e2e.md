# TC-UI-018: Old link for all projects

- **REQ:** REQ-UI-088@ed9bddcf
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** c0b254a9

**Preconditions:**
- The current project is `alpha`
- The URL `/reports?project=all&days=7&tab=delivery` (the retired choice "All projects")

**Test data:**
- None

**Steps:**
1. Open `/reports?project=all&days=7&tab=delivery`

**Expected:**
- The URL becomes `/reports?project=alpha&days=7&tab=delivery` without a new history entry
- 7 days is selected
- Only the report for `alpha` is requested, and the page has no project select
