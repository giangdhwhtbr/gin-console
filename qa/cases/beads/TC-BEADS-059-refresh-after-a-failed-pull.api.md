# TC-BEADS-059: Refresh after a failed pull

- **REQ:** REQ-BEADS-012@1a1b7a68
- **Priority:** high

**Preconditions:**
- Project P is configured; the fake `bd dolt pull` in P exits 1
- P's snapshot is current

**Steps:**
1. Send `POST /api/refresh`
2. Request `GET /api/projects`
3. Request the list of P

**Expected:**
- The refresh response is 204
- The caches were dropped (the file was read again)
- P has `pull.status` `error`
