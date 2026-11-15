# TC-UI-072: Indirect

- **REQ:** REQ-UI-075@59cf5290
- **Priority:** medium

**Preconditions:**
- Project `alpha` has tasks `a`, `b`, `c` and `d` without children
- `b` is blocked by `a`, `c` by `b` and `d` by `c`

**Steps:**
1. Open `/beads/alpha/c/graph`

**Expected:**
- `a` and `b` are drawn above `c`
- `d` is drawn below `c`
