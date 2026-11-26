# TC-REPORTS-102: Project without bugs

- **REQ:** REQ-REPORTS-044@0fa589cf
- **Priority:** high

**Preconditions:**
- Project `beta` has beads and no bug (`figures.total` is 0)

**Test data:**
- None

**Steps:**
1. Open `/reports/bugs?project=beta&days=30`

**Expected:**
- The section shows the scope select and "No bugs in beta"
- It shows no figures, no "Bugs per week", no "Bugs by epic" and no "Open bugs"
- The Bugs headline in the sidebar reads "No open bugs"
