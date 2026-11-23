# TC-UI-215: Text alternative

- **REQ:** REQ-UI-054@22273434
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 5df58c1f

**Preconditions:**
- Epic `e-1` in project `alpha` has tasks `a` and `b`, with `b` blocked by `a`

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=graph&scope=e-1`

**Expected:**
- The visually hidden list of the graph contains "b is blocked by a"
