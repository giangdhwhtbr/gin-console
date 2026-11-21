# TC-UI-108: Chain

- **REQ:** REQ-UI-048@566471d5
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-18T15-52-57

**Preconditions:**
- Epic `e-1` in project `alpha` has tasks `a`, `b`, `c`, where `b` is blocked by `a` and `c` by `b`

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=graph&scope=e-1`

**Expected:**
- `a`, `b`, `c` are in layers 0, 1, 2 from the top, with arrows `a`→`b` and `b`→`c`
