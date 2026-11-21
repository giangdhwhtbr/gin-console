# TC-UI-211: Cycle

- **REQ:** REQ-UI-050@7ac8e70f
- **Priority:** medium

**Preconditions:**
- Epic `e-1` in project `alpha` has tasks `a` and `b`, `a` blocked by `b` and `b` blocked by `a`

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=graph&scope=e-1`

**Expected:**
- `a` and `b` are drawn
- The page responds
- The warning "Dependency cycle between" names `a` and `b`
