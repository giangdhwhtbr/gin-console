# TC-UI-012: My Tasks lists the current project in order

- **REQ:** REQ-UI-100@14d1209a
- **Priority:** high

**Preconditions:**
- Any signed-in email; projects A and B in `/api/projects/beads`; the current project is A
- A has a P2 bead assigned to me updated today and a P1 bead assigned to me updated last week; B has a bead assigned to me
- Request log of the stubbed API

**Steps:**
1. Open /my-tasks?project=A
2. Click the P2 bead

**Expected:**
- After step 1 the P1 bead is first, no row has a project column, only the beads of A are listed, and no `GET /api/beads?project=B` request is sent
- After step 2 the page is `/beads/A/<id>`
