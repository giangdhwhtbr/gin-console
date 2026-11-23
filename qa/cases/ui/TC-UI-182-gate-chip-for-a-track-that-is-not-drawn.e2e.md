# TC-UI-182: Gate label for a track that is not drawn

- **REQ:** REQ-UI-117@8f9669e9
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** e274a9f3

**Preconditions:**
- Epic `ex-e12` has lane qa with track 4
- An open merge gate titled `external: .planning/plans/other.md#7` blocks track 4
- The gate's track is not a child of `ex-e12`

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12`

**Expected:**
- The label "Waiting for track 7" is on the top edge of the qa box
- No arrow is drawn for the gate
- No node is drawn for the gate
