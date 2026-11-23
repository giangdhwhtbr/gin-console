# TC-UI-339: Filter bar of a fixed milestone

- **REQ:** REQ-UI-142@7bd8f166
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 1fab53df

**Preconditions:**
- Project `p` has milestone `m2`
- Window 1440px wide

**Steps:**
1. Open the Beads tab of milestone `m2`, `/milestones/p/m2?tab=beads`

**Expected:**
- The bar has no Milestone filter
- The bar starts with the search box, then `button "Status"`, `button "Assignee"` and `button "More filters"`
