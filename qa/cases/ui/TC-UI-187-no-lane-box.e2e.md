# TC-UI-187: No lane box

- **REQ:** REQ-UI-118@e68b6fe0
- **Priority:** medium

**Preconditions:**
- Epic `ex-e12` has two tracks without a lane, one of them closed

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12`
2. Turn "Show closed" on

**Expected:**
- The two tracks sit in a box "No lane" with a dashed border
- The header shows "1/2 closed"
- The header has no colour swatch and no state
