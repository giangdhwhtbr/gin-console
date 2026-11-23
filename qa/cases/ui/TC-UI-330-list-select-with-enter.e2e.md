# TC-UI-330: List select with Enter

- **REQ:** REQ-UI-046@9b0edb23
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** cc574557

**Preconditions:**
- The List view of project `example` is shown at 1280px wide
- Focus is on the row of `t-2`, which is not selected

**Steps:**
1. Press `Enter`

**Expected:**
- The row of `t-2` is selected
- The URL has `select=t-2`
- `complementary "Bead details"` shows `t-2`
