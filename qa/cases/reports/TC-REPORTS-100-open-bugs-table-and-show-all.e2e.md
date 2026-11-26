# TC-REPORTS-100: Open bugs table and show all

- **REQ:** REQ-REPORTS-043@022646a7
- **Priority:** medium

**Preconditions:**
- Project `alpha` has a bugs report with 25 open bugs, one of them without priority and assignee and with the source unknown, the others of epic `e-2` "Checkout"

**Test data:**
- None

**Steps:**
1. Open `/reports/bugs?project=alpha&days=30`
2. Press "Show all 25" under "Open bugs"
3. Click the title of the first open bug

**Expected:**
- After step 1, the note says "All open bugs of alpha, whatever the scope", the table has the columns Bug, Priority, Assignee, Age and Epic, shows 20 rows in the order of the report, and a "Show all 25" button is shown
- After step 1, a bug shows its title with its id under it, `P<priority>`, its assignee or "Unassigned", `<n> d` and its epic or "Source unknown"
- After step 2, 25 rows are shown and the button is gone
- After step 3, the page of that bead `/beads/alpha/<id>` is shown
