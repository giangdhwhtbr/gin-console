# TC-UI-375: No Show children for a bead without children

- **REQ:** REQ-UI-149@544fbbd0
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** ee8a2d3e

**Preconditions:**
- The Graph view with scope `e1` and its task `e1.1`, which has no child, selected

**Steps:**
1. Read the panel

**Expected:**
- The panel offers "Open page"
- There is no `button "Show children"`
