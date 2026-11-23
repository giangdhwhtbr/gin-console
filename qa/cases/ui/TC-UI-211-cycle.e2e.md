# TC-UI-211: Cycle

- **REQ:** REQ-UI-050@7ac8e70f
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 1a142231

**Preconditions:**
- Epic `e-1` in project `alpha` has tasks `a` and `b`, `a` blocked by `b` and `b` blocked by `a`

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=graph&scope=e-1`

**Expected:**
- `a` and `b` are drawn
- The page responds
- The warning "Dependency cycle between" names `a` and `b`
