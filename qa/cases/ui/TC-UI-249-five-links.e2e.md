# TC-UI-249: Five links

- **REQ:** REQ-UI-055@52e3c936
- **Priority:** high

**Preconditions:**
- Projects `a` and `b` are configured and the current project is `a`

**Steps:**
1. Open `/my-tasks?project=a`

**Expected:**
- The "Main" navigation holds the links Projects, Beads, My Tasks, Milestones and Reports, one each, in that order
- They go to `/`, `/beads?project=a`, `/my-tasks`, `/milestones?project=a` and `/reports?project=a`
