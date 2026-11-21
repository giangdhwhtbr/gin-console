# TC-UI-067: Epic

- **REQ:** REQ-UI-075@b0eb7f1a
- **Priority:** high

**Preconditions:**
- Epic `e-1` in project `alpha` has tasks `a` and `b`, and `b` is blocked by `a`

**Steps:**
1. Open `/beads/alpha/e-1/graph`

**Expected:**
- The page of `e-1` is shown at `/beads/alpha/e-1?tab=graph`
- The Graph tab is open
- `a` and `b` are nodes
- An arrow goes from `a` to `b`
