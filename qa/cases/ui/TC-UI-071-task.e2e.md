# TC-UI-071: Task

- **REQ:** REQ-UI-075@59cf5290
- **Priority:** medium

**Preconditions:**
- Project `alpha` has tasks `a`, `b`, `c` and `z` without children
- `b` is blocked by `a` and `c` is blocked by `b`
- `z` has no dependency

**Steps:**
1. Open `/beads/alpha/b/graph`

**Expected:**
- `a`, `b` and `c` are drawn, with `a` above `b` and `b` above `c`
- `z` is not drawn
