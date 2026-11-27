# TC-BEADS-003: Story points

- **REQ:** REQ-BEADS-001@d5450d95
- **Priority:** medium

**Preconditions:**
- Project `p` with epic `e-1` whose metadata has `points: 5` and `points_reason: "new endpoint and UI"`, epic `e-2` whose metadata has `points: 4`, and epic `e-3` whose metadata has `points: "5"`

**Test data:**
- None

**Steps:**
1. Send `GET /api/beads?project=p`

**Expected:**
- `e-1` has `points: 5` and `points_reason: "new endpoint and UI"`
- `e-2` has `points: null` and `points_reason: null`
- `e-3` has `points: null` and `points_reason: null`
