# TC-REPORTS-025: Shared link

- **REQ:** REQ-REPORTS-012@79484a74
- **Priority:** medium

**Preconditions:**
- The URL `/reports/team?project=alpha&milestone=m1&member=ann&status=closed`

**Test data:**
- None

**Steps:**
1. Open `/reports/team?project=alpha&milestone=m1&member=ann&status=closed`

**Expected:**
- Milestone `m1`, member `ann` (shown as "ann (<scope>)" in the Member select) and the Closed list are shown
- The beads heading reads "Beads of ann"
