# TC-BEADS-039: Prep child

- **REQ:** REQ-BEADS-002@368f5c8f
- **Priority:** high

**Preconditions:**
- Project `alpha` has epic `e-1` with children `t-1`, `t-2`, `t-3` and `p-1`
- `t-1` and `t-2` have no label
- `p-1` is labelled `prep` and `prep:mockup`
- `t-3` is labelled `prep` and `track:api`

**Test data:**
- None

**Steps:**
1. Send `GET /api/beads/alpha/e-1`

**Expected:**
- `children` lists `t-1`, `t-2`, `t-3` and `p-1`
- `prep` is true for `p-1` only
