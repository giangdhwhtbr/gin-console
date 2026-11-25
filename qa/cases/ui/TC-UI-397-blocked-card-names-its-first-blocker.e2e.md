# TC-UI-397: Blocked card names its first blocker

- **REQ:** REQ-UI-065@3e3273a6
- **Priority:** medium

**Preconditions:**
- Project `alpha`; blocked task `t-3` has the open blockers `t-1` titled "Set up CI" and `t-2`, both loaded

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=board`

**Expected:**
- The card of `t-3` shows "Blocked by Set up CI"
- The card of `t-3` shows "+1"
