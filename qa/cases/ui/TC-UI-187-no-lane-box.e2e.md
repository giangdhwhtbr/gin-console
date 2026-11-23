# TC-UI-187: No lane box

- **REQ:** REQ-UI-118@2b93f058
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** e7ddda87

**Preconditions:**
- Epic `ex-e12` has two tracks without a lane, one of them closed

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12`
2. Turn "Show closed" on

**Expected:**
- The two tracks sit in a box "No lane" with a dashed border
- The header shows the strand followed by "1/2"
- The header has no colour swatch and no state
