# TC-UI-046: Change project clears the milestone

- **REQ:** REQ-UI-105@23e31689
- **Priority:** medium

**Preconditions:**
- Project `alpha` with milestones `m2` and `m3`, and project `beta` whose current milestone is `b1`

**Steps:**
1. Open `/my-tasks?project=alpha&milestone=m3`
2. Choose `beta` in the Project select

**Expected:**
- The URL is `/my-tasks?project=beta`
- The Milestone select shows `b1`
