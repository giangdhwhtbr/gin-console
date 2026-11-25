# TC-UI-012: My work lists the current project in order

- **REQ:** REQ-UI-100@6b611f17
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 7d49c2b4

**Preconditions:**
- Any signed-in email; projects A and B in `/api/projects/beads`; the current project is A
- A has a P2 ready bead assigned to me updated today and a P1 ready bead assigned to me updated last week; B has a bead assigned to me
- Request log of the stubbed API

**Steps:**
1. Open /my-tasks?project=A
2. Click the P2 bead

**Expected:**
- After step 1 the P1 bead is first in "Assigned to me", no row has a project column, only the beads of A are listed, and no `GET /api/beads?project=B` request is sent
- After step 2 the page is `/beads/A/<id>`
