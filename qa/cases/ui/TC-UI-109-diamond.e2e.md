# TC-UI-109: Diamond

- **REQ:** REQ-UI-048@bf494d4b
- **Priority:** medium

**Preconditions:**
- Epic `e-1` in project `alpha` has tasks `a`, `b`, `c` and `d`, where `b` and `c` are blocked by `a` and `d` is blocked by `b` and `c`

**Steps:**
1. Open `/beads/alpha/e-1/graph`

**Expected:**
- `a` is in layer 0, `b` and `c` in layer 1 and `d` in layer 2
