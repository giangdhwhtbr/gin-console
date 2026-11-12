# TC-UI-034: Restored from the URL

- **REQ:** REQ-UI-025@3a09b28c
- **Priority:** medium

**Preconditions:**
- Project `alpha` with beads of several statuses, priorities, assignees, sprints and milestones, including milestone `m2`, sprint `sprint-1` and assignee `alice@example.com`

**Steps:**
1. Open `/beads?project=alpha&status=open,in_progress&priority=0,1&assignee=alice%40example.com&sprint=sprint-1&milestone=m2`

**Expected:**
- The Status, Priority, Assignee, Sprint and Milestone filters show the values from the URL
- The beads shown match all of those filters
