# TC-BEADS-056: Failed pull note

- **REQ:** REQ-BEADS-018@edacce0f
- **Priority:** high

**Preconditions:**
- Projects A and B are stubbed on `GET /api/projects` and `GET /api/projects/beads`; A's `pull.status` is `error` with an error text and a path, B's `pull` is `null`
- Beads lists for A and B are stubbed

**Steps:**
1. Open `/my-tasks`
2. Open `/beads?project=A`

**Expected:**
- Each page shows one note naming A, its error, `bd dolt pull` and A's path
- Neither note names B
- The lists are shown below the note
