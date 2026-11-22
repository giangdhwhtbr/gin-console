# TC-UI-068: Project

- **REQ:** REQ-UI-075@b0eb7f1a
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** b5478646

**Preconditions:**
- Project `alpha` has epics `r-1` and `r-2` without a parent, and `r-2` is blocked by `r-1`
- `r-1` and `r-2` each have tasks

**Steps:**
1. Open `/beads/alpha/graph`

**Expected:**
- `/beads?project=alpha&view=graph` is shown
- `r-1` and `r-2` are nodes and their tasks are not
- An arrow goes from `r-1` to `r-2`
