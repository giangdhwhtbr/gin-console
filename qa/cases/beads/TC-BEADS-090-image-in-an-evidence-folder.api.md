# TC-BEADS-090: Image in an evidence folder

- **REQ:** REQ-BEADS-027@55f324e9
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-27T00-00-02-api
- **Checked:** b3c56abe

**Preconditions:**
- Project `q` with `evidence_roots: [<folder>]` and a JPEG file `BUG-5.jpg` in that folder
- Bead `q-1` of `q` and bead `a-2` of project `alpha` (without `evidence_roots`) that both name the absolute path of `BUG-5.jpg`

**Steps:**
1. Send `GET /api/beads/q/q-1`
2. Send `GET /api/beads/alpha/a-2`

**Expected:**
- Image 1 of `q-1` is available
- Image 1 of `a-2` is not available
