# TC-UI-081: Switch keeps filters

- **REQ:** REQ-UI-030@44faaaad
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-18T15-52-57

**Preconditions:**
- Project `a` with open beads; the List view is shown with the filter status "open" and the search "fix"

**Steps:**
1. Open `/beads?project=a&status=open&q=fix`
2. Choose Board in the views

**Expected:**
- The URL has `view=board`
- The filter status "open" and the search "fix" are unchanged
- No new request for the beads is made
