# TC-UI-109: Diamond

- **REQ:** REQ-UI-048@566471d5
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 75f7c2fb

**Preconditions:**
- Epic `e-1` in project `alpha` has tasks `a`, `b`, `c` and `d`, where `b` and `c` are blocked by `a` and `d` is blocked by `b` and `c`

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=graph&scope=e-1`

**Expected:**
- `a` is in layer 0, `b` and `c` in layer 1 and `d` in layer 2
