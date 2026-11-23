# TC-UI-176: Merge gate node

- **REQ:** REQ-UI-116@f93f8f82
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** c662dce1

**Preconditions:**
- The merge gate `ex-g3` is closed, has no parent and waits for track 3 of lane `fe`

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph`
2. Turn "Show closed" on

**Expected:**
- The gate `ex-g3` is a node with a dashed border and a merge icon
- The node reads "Waits for fe #3 to merge" and "Merged"
