# TC-UI-231: Links carry the project

- **REQ:** REQ-UI-124@e7f9eed5
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** c3583fbd

**Preconditions:**
- Projects `a` and `b` are configured and the current project is `b`

**Steps:**
1. Open `/my-tasks?project=b`

**Expected:**
- The Beads link goes to `/beads?project=b`, My Tasks to `/my-tasks?project=b`, Milestones to `/milestones?project=b` and Reports to `/reports?project=b`
- No link goes to `/`
