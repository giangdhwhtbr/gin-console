# TC-UI-388: Blocked by on the bead header

- **REQ:** REQ-UI-152@9367c485
- **Priority:** high

**Preconditions:**
- the signed-in email `ann@x.com` (localStorage `gin-console.email`)
- Project `P`; task `t-1` is blocked and its dependencies hold open `t-2` titled "Set up CI", open `t-3` titled "Design tokens" and closed `t-4`

**Steps:**
1. Open `/beads/P/t-1`
2. Click the "Set up CI" link of the "Blocked by" line

**Expected:**
- The header reads "Blocked by Set up CI, Design tokens"
- The header does not name `t-4`
- The link opens `/beads/P/t-2`
