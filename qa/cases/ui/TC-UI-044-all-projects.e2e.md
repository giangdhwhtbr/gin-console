# TC-UI-044: Current project

- **REQ:** REQ-UI-105@d5fc34b7
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 98d6fd9b

**Preconditions:**
- Project `alpha`, the current project, and project `beta`, each with an open bead assigned to me

**Steps:**
1. Open `/my-tasks`

**Expected:**
- The URL becomes `/my-tasks?project=alpha`
- The page has no Project select
- The Milestone select is enabled
- Only the task of `alpha` is listed
