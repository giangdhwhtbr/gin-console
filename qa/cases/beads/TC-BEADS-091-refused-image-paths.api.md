# TC-BEADS-091: Refused image paths

- **REQ:** REQ-BEADS-027@55f324e9
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-27T00-00-02-api
- **Checked:** 8fae196b

**Preconditions:**
- Project `alpha` with the PNG file `qa/evidence/r1/01.png`, a PNG file outside the project, a symlink `link.png` to that file, and a symlink `shots` to `qa/evidence`
- Bead `a-1` naming the outside file by its absolute path, `link.png`, `../alpha/qa/evidence/r1/01.png` and `shots/r1/01.png`

**Steps:**
1. Send `GET /api/beads/alpha/a-1`

**Expected:**
- Only `shots/r1/01.png` is available
- The other three are listed with `available: false`
