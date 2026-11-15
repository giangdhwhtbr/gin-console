# TC-UI-077: Prep task in the scope

- **REQ:** REQ-UI-075@59cf5290
- **Priority:** high

**Preconditions:**
- Epic `e-1` in project `alpha` has tasks `t-1` (closed) and `t-2` (open) and prep task `p-1` (open) labelled `prep` and `prep:mockup`

**Steps:**
1. Open `/beads/alpha/e-1/graph`

**Expected:**
- `t-1`, `t-2` and `p-1` are nodes
- The heading bar reads "1 of 2 done"
