# TC-BEADS-063: Not a lane name

- **REQ:** REQ-BEADS-019@afe14198
- **Priority:** low
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** 7289403e

**Preconditions:**
- Project `alpha` has a bead with the description line `Lane: Back End` and no `lane:` label

**Test data:**
- None

**Steps:**
1. Send `GET /api/beads?project=alpha`

**Expected:**
- The bead has `lane` `null`
