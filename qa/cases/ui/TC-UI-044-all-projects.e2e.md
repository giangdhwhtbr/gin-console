# TC-UI-044: Current project

- **REQ:** REQ-UI-105@d5fc34b7
- **Priority:** medium

**Preconditions:**
- Project `alpha`, the current project, and project `beta`, each with an open bead assigned to me

**Steps:**
1. Open `/my-tasks`

**Expected:**
- The URL becomes `/my-tasks?project=alpha`
- The page has no Project select
- The Milestone select is enabled
- Only the task of `alpha` is listed
