# TC-BEADS-094: Image not served

- **REQ:** REQ-BEADS-028@487cfa9a
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-27T00-00-02-api
- **Checked:** 089450c1

**Preconditions:**
- Bead `a-1` of `alpha` with one available image and one image outside the allowed folders
- No bead `a-9` and no project `nope`

**Steps:**
1. Send `GET /api/beads/alpha/a-1/images/2`
2. Send `GET /api/beads/alpha/a-1/images/3`
3. Send `GET /api/beads/alpha/a-1/images/0`
4. Send `GET /api/beads/alpha/a-9/images/1`
5. Send `GET /api/beads/nope/a-1/images/1`

**Expected:**
- Every response is 404 with the same body
