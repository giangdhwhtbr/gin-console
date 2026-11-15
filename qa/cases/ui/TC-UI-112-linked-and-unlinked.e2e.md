# TC-UI-112: Linked and unlinked

- **REQ:** REQ-UI-048@bf494d4b
- **Priority:** high

**Preconditions:**
- Epic `e-1` in project `alpha` has task `b` blocked by `a`, and tasks `c`, `d`, `e`, `f` without blockers that block nothing

**Steps:**
1. Open `/beads/alpha/e-1/graph`

**Expected:**
- `a` and `b` are in layers 0 and 1
- `c`, `d`, `e` then `f` are placed below them in rows of 3 under "4 without dependencies"
