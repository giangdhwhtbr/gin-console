# TC-UI-280: Plain labels in the Gantt row

- **REQ:** REQ-UI-134@69f0a1c6
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T04-57-11
- **Checked:** 8fbfdee8

**Preconditions:**
- Epic `ex-e3` has 5 of 11 tracks closed, 1 of 3 prep tasks closed and a confirmed spec, and belongs to a milestone of project `example`

**Steps:**
1. Open the milestone page of that milestone, for example `/milestones/example/ex-m2`

**Expected:**
- The second line of the Gantt row of `ex-e3` shows the strand followed by "5/11", then "Prep 1/3" and "Spec approved"
