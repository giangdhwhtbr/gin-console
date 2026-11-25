# TC-UI-231: Links carry the project

- **REQ:** REQ-UI-124@12df9249
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-32-34
- **Checked:** c585dd9e

**Preconditions:**
- Projects `a` and `b` are configured and the current project is `b`

**Steps:**
1. Open `/my-tasks?project=b`

**Expected:**
- The Beads link goes to `/beads?project=b`, My work to `/my-tasks?project=b`, Milestones to `/milestones?project=b`, Requirements to `/requirements?project=b` and Reports to `/reports?project=b`
- The Overview link goes to `/` and no other link goes to `/`
