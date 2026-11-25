# TC-UI-389: Blocked status without a blocker

- **REQ:** REQ-UI-152@9367c485
- **Priority:** medium

**Preconditions:**
- the signed-in email `ann@x.com` (localStorage `gin-console.email`)
- Project `P`; task `t-1` has the status `blocked` and no dependency

**Steps:**
1. Open `/beads/P/t-1`

**Expected:**
- The header shows the state "Blocked"
- The header has no "Blocked by" line
