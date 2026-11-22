# TC-UI-096: Milestone page last

- **REQ:** REQ-UI-073@99c2938a
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** d4f3d609

**Preconditions:**
- Project `a` with milestone `m2` and bead `a-1` under it with a dependency so that it is a node of the Graph view

**Steps:**
1. Open `/beads?project=a`
2. Open `/milestones/a/m2?tab=beads&view=graph`
3. Open the bead page of a node
4. Use the first link of the breadcrumb

**Expected:**
- The Graph view of the Beads tab of `m2` is shown
