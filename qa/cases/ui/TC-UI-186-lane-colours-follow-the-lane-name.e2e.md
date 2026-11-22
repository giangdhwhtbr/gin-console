# TC-UI-186: Lane colours follow the lane name

- **REQ:** REQ-UI-118@2b93f058
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 68874123

**Preconditions:**
- Epic `ex-e12` has lanes be, fe, infra and qa, and bao is the assignee of the tracks of lane fe only

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12`
2. Note the colours of the fe, be, infra and qa boxes
3. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12&assignee=bao`

**Expected:**
- Without the filter the colours of be, fe, infra and qa are lane colours 1, 2, 3 and 4
- With the filter only the fe box is shown, and it has lane colour 2 as before
