# TC-UI-363: Enter twice in the List

- **REQ:** REQ-UI-147@a7576fab
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** b0a3812a

**Preconditions:**
- The List view of project `example` at 1280px wide
- Focus is on the row of `t-2`, which is not selected

**Steps:**
1. Press `Enter`
2. Press `Enter` again

**Expected:**
- The first `Enter` selects `t-2` and shows its panel
- The second `Enter` opens the bead page of `t-2`
