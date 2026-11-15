# TC-UI-078: Member bar

- **REQ:** REQ-UI-089@35bfa375
- **Priority:** medium

**Preconditions:**
- The report of project `alpha` has members `ann` and `Unassigned`

**Steps:**
1. Open `/reports?project=alpha&days=90&tab=usage`
2. Focus the bar of `ann`

**Expected:**
- The chart has one bar per member, stacked by stage
- The bar of `ann` shows her closed beads, tokens, cost, tokens per bead and cache ratio
