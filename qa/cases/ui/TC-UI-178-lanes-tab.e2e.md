# TC-UI-178: Lanes tab

- **REQ:** REQ-UI-030@0f5a1d68
- **Priority:** high

**Preconditions:**
- "Show closed" is off
- `ex-e12` is an epic whose tracks have lanes

**Steps:**
1. Open `/beads?project=example&view=graph&scope=ex-e12`
2. Choose Lanes in the views

**Expected:**
- The URL has `view=lanes`
- The filters are unchanged
- The closed beads are loaded
