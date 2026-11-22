# TC-UI-156: Lanes offered for an epic with lanes

- **REQ:** REQ-UI-111@c5095b0c
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 2ec925b9

**Preconditions:**
- The example project has epic `ex-e12`, whose tracks have lanes, and epic `ex-e3`, whose tracks have none

**Steps:**
1. Open `/beads?project=example&view=graph&scope=ex-e12`
2. Open `/beads?project=example&view=graph&scope=ex-e3`
3. Open `/beads?project=example&view=graph`

**Expected:**
- After step 1, the Lanes tab is offered
- After step 2, the Lanes tab is not offered
- After step 3, the Lanes tab is not offered
