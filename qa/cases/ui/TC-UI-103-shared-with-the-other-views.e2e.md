# TC-UI-103: Shared with the other views

- **REQ:** REQ-UI-106@3747fc19
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-18T15-52-57

**Preconditions:**
- Project `p` with beads, some of whose titles contain "pay"

**Steps:**
1. Open `/beads?project=p&q=pay`
2. Choose Graph in the views

**Expected:**
- The search "pay" still applies
- No new request for the beads is made
