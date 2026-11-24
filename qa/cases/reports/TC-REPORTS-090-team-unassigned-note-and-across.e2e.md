# TC-REPORTS-090: Team unassigned note and Across milestones trend panel

- **REQ:** REQ-REPORTS-036@af5b83aa
- **Priority:** high

**Preconditions:**
- Project `alpha` team report for `m2` with `unassigned: {closed: 8, total: 30}` and `trend` holding `m0` (`accuracy: null`), `m1` and `m2`
- A second report for `m1` with `unassigned: {closed: 2, total: 30}`

**Test data:**
- None

**Steps:**
1. Open `/reports/team?project=alpha&milestone=m2`
2. Switch to `m1` in the scope select

**Expected:**
- After step 1, the note "8 of 30 closed beads have no assignee, so member numbers undercount." is shown above the member table
- "Across milestones" shows three rows (`m0`, `m1`, `m2`), `m2` is marked `aria-current="true"`, and `m0`'s accuracy reads "—"
- After step 2, no unassigned note is shown
