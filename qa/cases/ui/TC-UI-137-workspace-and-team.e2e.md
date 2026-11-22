# TC-UI-137: Workspace and team

- **REQ:** REQ-UI-003@112b8612
- **Priority:** high

**Preconditions:**
- Project `alpha` has a workspace of 8 repos, one of them frozen
- Team mode is on with host `github`

**Steps:**
1. Open `/`
2. On the card of `alpha`, choose "Show repos"

**Expected:**
- The card shows "Workspace of 8 repos" and "Team mode on github"
- The card lists the 8 repos with the frozen one marked
