# TC-UI-067: Epic

- **REQ:** REQ-UI-075@59cf5290
- **Priority:** high

**Preconditions:**
- Epic `e-1` in project `alpha` has tasks `a` and `b`, and `b` is blocked by `a`

**Steps:**
1. Open `/beads/alpha/e-1/graph`

**Expected:**
- The heading bar names `e-1` and "0 of 2 done"
- `a` and `b` are nodes
- An arrow goes from `a` to `b`
