# TC-UI-108: Chain

- **REQ:** REQ-UI-048@bf494d4b
- **Priority:** medium

**Preconditions:**
- Epic `e-1` in project `alpha` has tasks `a`, `b`, `c`, where `b` is blocked by `a` and `c` by `b`

**Steps:**
1. Open `/beads/alpha/e-1/graph`

**Expected:**
- `a`, `b`, `c` are in layers 0, 1, 2 from the top, with arrows `a`→`b` and `b`→`c`
