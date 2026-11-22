# TC-UI-231: Links carry the project

- **REQ:** REQ-UI-124@86ecfe10
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 3a2873ad

**Preconditions:**
- Projects `a` and `b` are configured and the current project is `b`

**Steps:**
1. Open `/my-tasks?project=b`

**Expected:**
- The Beads link goes to `/beads?project=b`, Milestones to `/milestones?project=b` and Reports to `/reports?project=b`
- The Projects link goes to `/` and My Tasks to `/my-tasks`
