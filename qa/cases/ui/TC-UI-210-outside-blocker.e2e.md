# TC-UI-210: Outside blocker

- **REQ:** REQ-UI-050@7ac8e70f
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** cf66300e

**Preconditions:**
- Epic `e-1` in project `alpha` has task `t-1` blocked by `x-9`, a task of another epic

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=graph&scope=e-1`

**Expected:**
- `x-9` is drawn dimmed with a dashed border above `t-1`
- An arrow goes from `x-9` to `t-1`
