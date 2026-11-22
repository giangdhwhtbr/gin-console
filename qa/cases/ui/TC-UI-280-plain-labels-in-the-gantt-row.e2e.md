# TC-UI-280: Plain labels in the Gantt row

- **REQ:** REQ-UI-134@16348b81
- **Priority:** medium

**Preconditions:**
- Epic `ex-e3` has 5 of 11 tracks closed, 1 of 3 prep tasks closed and a confirmed spec, and belongs to a milestone of project `example`

**Steps:**
1. Open the milestone page of that milestone, for example `/milestones/example/ex-m2`

**Expected:**
- The second line of the Gantt row of `ex-e3` reads "5 of 11 done", "Prep 1 of 3 done" and "Spec approved"
