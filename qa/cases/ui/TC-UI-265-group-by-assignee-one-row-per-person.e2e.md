# TC-UI-265: Group by assignee one row per person

- **REQ:** REQ-UI-034@2aaf45c7
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** e87fb251

**Preconditions:**
- Project `alpha` has a bead assigned to `ann` and a bead assigned to `ann@example.com`

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=focus`
2. Choose Group by "Assignee"

**Expected:**
- One row `ann` holds both beads
- No row `ann@example.com` is shown
