# TC-BEADS-108: No git without shared entries

- **REQ:** REQ-BEADS-031@400d25fb
- **Priority:** medium

**Preconditions:**
- Project `beta` has bead `b-1` with no entry but a description naming `attachment:A`, and bead `b-2` with only an entry `{sha256: B, store: "local"}`
- A fake git records every call

**Steps:**
1. Send `GET /api/beads?project=beta`
2. Send `GET /api/beads/beta/b-1`
3. Send `GET /api/beads/beta/b-2`

**Expected:**
- Every response is 200
- The fake git recorded no call
