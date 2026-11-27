# TC-BEADS-092: Files that are not images

- **REQ:** REQ-BEADS-027@864c75b7
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-27T00-00-02-api
- **Checked:** be984206

**Preconditions:**
- Project `alpha` with `fake.png` that holds text, `logo.png` that holds SVG, a PNG file of 11 MB and no file `gone.png`
- Bead `a-1` naming the four files

**Steps:**
1. Send `GET /api/beads/alpha/a-1`

**Expected:**
- Images 1 to 4 are listed with `available: false`
