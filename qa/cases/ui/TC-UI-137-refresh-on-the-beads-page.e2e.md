# TC-UI-137: Refresh on the Beads page

- **REQ:** REQ-UI-096@f1d72cb6
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 034af33a

**Preconditions:**
- Project `a` is configured with at least one bead

**Steps:**
1. Open `/beads?project=a`
2. Activate "Refresh data"

**Expected:**
- `POST /api/refresh` is sent, then the beads are requested again
- The URL is unchanged
