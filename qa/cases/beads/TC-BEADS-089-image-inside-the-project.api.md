# TC-BEADS-089: Image inside the project

- **REQ:** REQ-BEADS-027@55f324e9
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-27T00-00-02-api
- **Checked:** 91d2e215

**Preconditions:**
- Project `alpha` with a PNG file `qa/evidence/r1/01.png` of 200 KB in its folder
- Bead `a-1` of `alpha` naming `qa/evidence/r1/01.png`

**Steps:**
1. Send `GET /api/beads/alpha/a-1`

**Expected:**
- Image 1 is available
