# TC-MILESTONE-UI-105: Bead page of a milestone

- **REQ:** REQ-MILESTONE-UI-022@e3343c6c
- **Priority:** medium

**Preconditions:**
- Project `P` has milestone `ex-m2`, a bead of type `milestone` with status `open`, whose kick-off was on 10 Nov 2026
- The browser clock is set to 21 Nov 2026
- `GET /api/beads/milestones` reports `ex-m2` with status `active`

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/beads/P/ex-m2`

**Expected:**
- The header shows "Active" with the active icon
- The header does not show "Open" or "Ready"
