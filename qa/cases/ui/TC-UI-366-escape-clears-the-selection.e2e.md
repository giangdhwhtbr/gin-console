# TC-UI-366: Escape clears the selection

- **REQ:** REQ-UI-147@a7576fab
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** da16d4d8

**Preconditions:**
- `t-1` is selected on the Board at 1280px wide
- The card of `t-1` has focus

**Steps:**
1. Press `Esc`

**Expected:**
- The URL has no `select`
- `complementary "Bead details"` is gone
- The card of `t-1` has focus
