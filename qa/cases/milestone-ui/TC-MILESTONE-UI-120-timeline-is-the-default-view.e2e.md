# TC-MILESTONE-UI-120: Timeline is the default view

- **REQ:** REQ-MILESTONE-UI-033@4e0cb01a
- **Priority:** high

**Preconditions:**
- Project `alpha` whose `milestone list` reports milestone `m1` "Alpha launch" (active, 2 Nov to 27 Nov 2026) and a `forecast` with one epic of `m1`

**Test data:**
- Today: 2026-11-12

**Steps:**
1. Open `/milestones?project=alpha`
2. Open `/milestones?project=alpha&view=other`

**Expected:**
- After step 1: the Timeline is shown and Timeline is marked current in the View row
- After step 1: List is not marked current, and the URL has no `view`
- After step 2: the Timeline is shown and Timeline is marked current
- After step 2: the URL still reads `view=other` and nothing was added to it
