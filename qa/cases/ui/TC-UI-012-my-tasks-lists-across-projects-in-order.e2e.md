# TC-UI-012: My Tasks lists across projects in order

- **REQ:** REQ-UI-100@651177c0
- **Priority:** high

**Preconditions:**
- Any signed-in email; projects A and B in `/api/projects/beads`
- A has a P2 bead assigned to me updated today; B has a P1 bead assigned to me updated last week

**Steps:**
1. Open /my-tasks
2. Click the A bead

**Expected:**
- After step 1 the B bead is first and each row shows its project
- After step 2 the page is `/beads/A/<id>`
