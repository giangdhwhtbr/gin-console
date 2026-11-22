# TC-UI-178: Lanes tab

- **REQ:** REQ-UI-030@0f5a1d68
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** facedb6a

**Preconditions:**
- "Show closed" is off
- A bead of `ex-e12` has a title containing "Payment"
- `ex-e12` is an epic whose tracks have lanes

**Steps:**
1. Open `/beads?project=example&view=graph&scope=ex-e12&q=Payment`
2. Choose Lanes in the views

**Expected:**
- The URL has `view=lanes`
- The search "Payment" is unchanged
- The closed beads are loaded
