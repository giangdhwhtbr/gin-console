# TC-UI-045: Project with a current milestone

- **REQ:** REQ-UI-105@23e31689
- **Priority:** high

**Preconditions:**
- Project `alpha` whose current milestone is `m2`, with my open tasks under `m2` and under planned milestone `m3`, and project `beta`

**Steps:**
1. Open `/my-tasks`
2. Choose `alpha` in the Project select

**Expected:**
- The URL is `/my-tasks?project=alpha`
- The Milestone select shows `m2`
- Only my tasks under `m2` are listed
