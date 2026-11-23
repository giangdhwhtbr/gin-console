# TC-UI-327: List roles

- **REQ:** REQ-UI-046@9b0edb23
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 6d606983

**Preconditions:**
- The List view of project `example` is shown at 1280px wide with an open epic `e-1` that has children `t-1` and `t-2`

**Steps:**
1. Read the accessibility tree of the List

**Expected:**
- The List is a `tree`
- The row of `e-1` is a `treeitem` with `aria-expanded` true
- The rows of `t-1` and `t-2` are treeitems with an `aria-level` greater than the one of `e-1`
