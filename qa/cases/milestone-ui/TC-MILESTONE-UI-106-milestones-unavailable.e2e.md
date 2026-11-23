# TC-MILESTONE-UI-106: Milestones unavailable

- **REQ:** REQ-MILESTONE-UI-022@e3343c6c
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 6219d70d

**Preconditions:**
- Project `P` has milestone `ex-m2`, a bead of type `milestone` with status `open`
- `GET /api/beads/milestones` answers 502

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/beads/P/ex-m2`

**Expected:**
- The header shows the bead status of `ex-m2` as the bead page describes it
- The header does not show a milestone status word such as "Active" or "Planned"
