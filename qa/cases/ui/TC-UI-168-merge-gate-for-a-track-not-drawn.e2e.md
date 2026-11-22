# TC-UI-168: Merge gate for a track not drawn

- **REQ:** REQ-UI-113@15c19511
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** cfe84420

**Preconditions:**
- A merge gate titled `external: .planning/plans/other.md#7` blocks track 4 and matches no child of the scope

**Steps:**
1. Open `/beads?project=example&view=lanes&scope=ex-e12`

**Expected:**
- No arrow is drawn for the gate
- The marker "Waiting for track 7" is drawn above the card of track 4
