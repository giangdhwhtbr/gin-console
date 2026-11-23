# TC-BEADS-059: Refresh after a failed pull

- **REQ:** REQ-BEADS-012@49e4c74a
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** 79484d34

**Preconditions:**
- Project P is configured; the fake `bd dolt pull` in P exits 1
- P's snapshot is current

**Steps:**
1. Send `POST /api/refresh`
2. Request `GET /api/projects/beads`
3. Request the list of P

**Expected:**
- The refresh response is 204
- The caches were dropped (the file was read again)
- P has `pull.status` `error`
