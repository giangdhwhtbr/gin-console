# TC-UI-046: Change project clears the milestone

- **REQ:** REQ-UI-105@d5fc34b7
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-45-40
- **Checked:** 02fc5d14

**Preconditions:**
- Project `alpha` with milestones `m2` and `m3`, and project `beta` whose current milestone is `b1`

**Steps:**
1. Open `/my-tasks?project=alpha&milestone=m3`
2. Open the project switcher
3. Choose `beta`

**Expected:**
- The URL is `/my-tasks?project=beta`
- The Milestone select shows `b1`
