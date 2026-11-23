# TC-UI-263: Focus in progress and blocked

- **REQ:** REQ-UI-033@51749fbd
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** ec0251fc

**Preconditions:**
- Project `alpha` has an in-progress bead `t-1` that is also blocked (status `blocked` or an open blocker)

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=focus`

**Expected:**
- `t-1` is in the Blocked column only
- The In flight column does not hold `t-1`
