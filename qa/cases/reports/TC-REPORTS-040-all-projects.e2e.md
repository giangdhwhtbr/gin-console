# TC-REPORTS-040: All projects

- **REQ:** REQ-REPORTS-017@7e156804
- **Priority:** medium

**Preconditions:**
- "All projects" is selected

**Test data:**
- None

**Steps:**
1. Open `/reports?project=all&tab=team`

**Expected:**
- It says "Pick a project to see its team" and no request goes to `/api/reports/team`
