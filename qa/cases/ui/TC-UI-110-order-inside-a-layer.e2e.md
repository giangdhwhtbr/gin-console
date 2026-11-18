# TC-UI-110: Order inside a layer

- **REQ:** REQ-UI-048@bf494d4b
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-18T15-52-57

**Preconditions:**
- Epic `e-1` in project `alpha` has tasks `a` and `b` without blockers, `x` blocked by `b` and `y` blocked by `a`, and `a` is placed before `b`

**Steps:**
1. Open `/beads/alpha/e-1/graph`

**Expected:**
- `y` is placed before `x` in layer 1, so that the arrows do not cross
