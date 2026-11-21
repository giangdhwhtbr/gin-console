# TC-UI-231: Links carry the project

- **REQ:** REQ-UI-124@86ecfe10
- **Priority:** high

**Preconditions:**
- Projects `a` and `b` are configured and the current project is `b`

**Steps:**
1. Open `/my-tasks?project=b`

**Expected:**
- The Beads link goes to `/beads?project=b`, Milestones to `/milestones?project=b` and Reports to `/reports?project=b`
- The Projects link goes to `/` and My Tasks to `/my-tasks`
