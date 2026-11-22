# TC-UI-081: Switch keeps filters

- **REQ:** REQ-UI-030@0f5a1d68
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 8b8c961d

**Preconditions:**
- Project `a` with open beads; the List view is shown with the filter status "open" and the search "fix"

**Steps:**
1. Open `/beads?project=a&status=open&q=fix`
2. Choose Board in the views

**Expected:**
- The URL has `view=board`
- The filter status "open" and the search "fix" are unchanged
- No new request for the beads is made
