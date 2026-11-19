# TC-BEADS-057: Older backend without pull

- **REQ:** REQ-BEADS-018@edacce0f
- **Priority:** low

**Preconditions:**
- `GET /api/projects` and `GET /api/projects/beads` are stubbed with projects that have no `pull` key

**Steps:**
1. Open `/`
2. Open `/beads?project=a`
3. Open `/my-tasks`

**Expected:**
- No pull line is shown on any project card
- No pull note is shown on the Beads page or My Tasks
