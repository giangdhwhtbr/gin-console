# TC-UI-231: Links carry the project

- **REQ:** REQ-UI-124@79a26394
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-26T02-30-19
- **Checked:** c585dd9e

**Preconditions:**
- Projects `a` and `b` are configured and the current project is `b`

**Steps:**
1. Open `/my-tasks?project=b`

**Expected:**
- The Beads link goes to `/beads?project=b`, My work to `/my-tasks?project=b`, Milestones to `/milestones?project=b`, Requirements to `/requirements?project=b`, Tests to `/tests?project=b` and Reports to `/reports?project=b`
- The Overview link goes to `/` and no other link goes to `/`
