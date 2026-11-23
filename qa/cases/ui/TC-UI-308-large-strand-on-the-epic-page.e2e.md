# TC-UI-308: Large strand on the epic page

- **REQ:** REQ-UI-138@b0819958
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 986ff62f

**Preconditions:**
- Project `P` reports epic `ex-e12` with 8 tracks: 4 closed, 1 in progress, 1 blocked and 2 ready

**Steps:**
1. Open `/beads/P/ex-e12`
2. Read the Progress card of the Overview tab

**Expected:**
- The Progress card shows a strand of 8 beads, larger than the beads of a List row
- The strand is followed by "4 done, 1 in progress, 1 blocked, 2 ready"
