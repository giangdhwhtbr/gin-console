# TC-UI-110: Order inside a layer

- **REQ:** REQ-UI-048@566471d5
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 0b469de9

**Preconditions:**
- Epic `e-1` in project `alpha` has tasks `a` and `b` without blockers, `x` blocked by `b` and `y` blocked by `a`, and `a` is placed before `b`

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=graph&scope=e-1`

**Expected:**
- `y` is placed before `x` in layer 1, so that the arrows do not cross
