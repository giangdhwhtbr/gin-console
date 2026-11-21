# TC-BEADS-042: Stage of an epic

- **REQ:** REQ-BEADS-020@fa401781
- **Priority:** medium

**Preconditions:**
- Project `p` has epic `e-1`
- `gin state --workflow-id e-1 --format json` reports stage `execute`, gates `{"plan_approved": "satisfied", "shipped": "unmet"}`, one warning and no review waiver

**Test data:**
- None

**Steps:**
1. Send `GET /api/beads/p/e-1/workflow`

**Expected:**
- The answer is 200
- It carries stage `execute`, those gates and the warning
- `review_waivers` is empty
