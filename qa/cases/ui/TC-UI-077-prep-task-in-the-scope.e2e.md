# TC-UI-077: Prep task in the scope

- **REQ:** REQ-UI-075@b0eb7f1a
- **Priority:** high

**Preconditions:**
- Epic `e-1` in project `alpha` has tasks `t-1` (closed) and `t-2` (open) and prep task `p-1` (open) labelled `prep` and `prep:mockup`
- "Show closed" is on

**Steps:**
1. Open `/beads/alpha/e-1/graph`

**Expected:**
- The Graph tab of the page of `e-1` is open
- `t-1`, `t-2` and `p-1` are nodes
