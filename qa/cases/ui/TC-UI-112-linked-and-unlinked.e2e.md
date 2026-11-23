# TC-UI-112: Linked and unlinked

- **REQ:** REQ-UI-048@566471d5
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 5782dc14

**Preconditions:**
- Epic `e-1` in project `alpha` has task `b` blocked by `a`, and tasks `c`, `d`, `e`, `f` without blockers that block nothing

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=graph&scope=e-1`

**Expected:**
- `a` and `b` are in layers 0 and 1
- `c`, `d`, `e` then `f` are placed below them in rows of 3 under "4 without dependencies"
