# TC-UI-249: Four links

- **REQ:** REQ-UI-055@38d488fb
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 67a8f6be

**Preconditions:**
- Projects `a` and `b` are configured and the current project is `a`

**Steps:**
1. Open `/my-tasks?project=a`

**Expected:**
- The "Main" navigation holds the links Beads, My Tasks, Milestones and Reports, one each, in that order
- They go to `/beads?project=a`, `/my-tasks?project=a`, `/milestones?project=a` and `/reports?project=a`, and no link goes to `/`
