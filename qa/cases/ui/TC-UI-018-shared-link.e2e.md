# TC-UI-018: Old link for all projects

- **REQ:** REQ-UI-088@e23f9c54
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** c0b254a9

**Preconditions:**
- The current project is `alpha`
- The URL `/reports/delivery?project=all&days=7` (the retired choice "All projects")

**Test data:**
- None

**Steps:**
1. Open `/reports/delivery?project=all&days=7`

**Expected:**
- The URL becomes `/reports/delivery?project=alpha&days=7` without a new history entry
- "Last 7 days" is selected
- Only the report for `alpha` is requested, and the page has no project select
