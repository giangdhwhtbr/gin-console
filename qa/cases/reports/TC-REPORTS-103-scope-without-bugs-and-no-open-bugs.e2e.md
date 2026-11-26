# TC-REPORTS-103: Scope without bugs and no open bugs

- **REQ:** REQ-REPORTS-044@0fa589cf
- **Priority:** medium

**Preconditions:**
- Project `alpha` has one bug of epic `e-1`, open since before the period: `total` 1, `opened` 0, `closed` 0, `open_now` 1
- A second scope, a milestone that has not started, has `period` `null` and no open bug

**Test data:**
- None

**Steps:**
1. Open `/reports/bugs?project=alpha&days=7`
2. Pick the milestone that has not started in the scope select

**Expected:**
- After step 1, "Bugs per week" says "No bugs in this scope", "Bugs by epic" lists `e-1` with 0, 0 and 1, and "Open bugs" lists the bug
- After step 2, "Bugs per week" and "Bugs by epic" say "No bugs in this scope" and "Open bugs" says "No open bugs"
