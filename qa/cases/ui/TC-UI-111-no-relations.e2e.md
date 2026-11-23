# TC-UI-111: No relations

- **REQ:** REQ-UI-048@566471d5
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** be0847ff

**Preconditions:**
- Epic `e-1` in project `alpha` has 7 tasks that block none of each other

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=graph&scope=e-1`

**Expected:**
- The 7 nodes are placed in rows of 3, 3 and 1 under "7 without dependencies"
