# TC-UI-045: Project with a current milestone

- **REQ:** REQ-UI-105@d5fc34b7
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** e2b8394d

**Preconditions:**
- Project `alpha` whose current milestone is `m2`, with my open tasks under `m2` and under planned milestone `m3`

**Steps:**
1. Open `/my-tasks?project=alpha`

**Expected:**
- The Milestone select shows `m2`
- Only my tasks under `m2` are listed
