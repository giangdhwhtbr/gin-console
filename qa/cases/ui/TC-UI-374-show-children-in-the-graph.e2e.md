# TC-UI-374: Show children in the Graph

- **REQ:** REQ-UI-149@544fbbd0
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** e5fdc8bb

**Preconditions:**
- The Graph view of milestone `m2` at 1440px wide with `select=e1`
- `e1` is an epic with tasks

**Steps:**
1. Click `button "Show children"` in the panel

**Expected:**
- The URL has `scope=e1` and no `select`
- The tasks of `e1` are drawn
- No panel is shown
- The breadcrumb reads `m2` › `e1`
