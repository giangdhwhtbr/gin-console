# TC-REPORTS-025: Shared link

- **REQ:** REQ-REPORTS-012@023dc4c5
- **Priority:** medium

**Preconditions:**
- The URL `/reports?project=alpha&tab=team&milestone=m1&member=ann&status=closed`

**Test data:**
- None

**Steps:**
1. Open `/reports?project=alpha&tab=team&milestone=m1&member=ann&status=closed`

**Expected:**
- Milestone `m1`, member `ann` (shown as "ann (<scope>)" in the Member select) and the Closed list are shown
- The beads heading reads "Beads of ann"
