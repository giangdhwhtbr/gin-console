# TC-UI-137: Workspace and team

- **REQ:** REQ-UI-003@74d726be
- **Priority:** high

**Preconditions:**
- Project `alpha` has a workspace of 8 repos, one of them frozen
- Team mode is on with host `github`

**Steps:**
1. Open `/`
2. On the card of `alpha`, choose "Show repos"

**Expected:**
- The card shows "workspace · 8 repos" and "team · github"
- The card lists the 8 repos with the frozen one marked
