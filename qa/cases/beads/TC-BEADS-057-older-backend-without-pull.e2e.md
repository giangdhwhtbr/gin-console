# TC-BEADS-057: Older backend without pull

- **REQ:** REQ-BEADS-018@3ceab845
- **Priority:** low
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 5ff49f95

**Preconditions:**
- `GET /api/projects` and `GET /api/projects/beads` are stubbed with projects that have no `pull` key

**Steps:**
1. Open `/`
2. Open `/beads?project=a`
3. Open `/my-tasks`

**Expected:**
- No pull line is shown on any project card
- No pull note is shown on the Beads page or My Tasks
