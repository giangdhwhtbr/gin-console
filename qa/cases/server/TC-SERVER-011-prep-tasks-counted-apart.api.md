# TC-SERVER-011: Prep tasks counted apart

- **REQ:** REQ-SERVER-006@ea632040
- **Priority:** high

**Preconditions:**
- Project `alpha` has only these beads
- In_progress epic `e-1`
- Open ready tracks `t-1` and `t-2`, without blockers
- Open prep task `p-1` labelled `prep` and `prep:mockup`, without blockers
- Closed prep task `p-2` labelled `prep`

**Test data:**
- None

**Steps:**
1. Send `GET /api/projects`

**Expected:**
- `beads.open` of `alpha` is 2
- `beads.in_progress` is 1
- `beads.ready` is 2
- `beads.blocked` is 0
- `beads.prep` is 1
