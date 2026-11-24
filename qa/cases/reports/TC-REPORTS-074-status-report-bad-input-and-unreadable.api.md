# TC-REPORTS-074: Status report bad input and unreadable snapshot

- **REQ:** REQ-REPORTS-020@ed25d604
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-24T03-52-06-api
- **Checked:** bc7dc59d

**Preconditions:**
- No project `nope` is configured
- Project `alpha` is configured; for the snapshot failure check, its snapshot cannot be read as in REQ-BEADS-005

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/status?project=nope`
2. Send `GET /api/reports/status?project=alpha&days=14`
3. Send `GET /api/reports/status?project=alpha&milestone=a b`
4. Send `GET /api/reports/status?project=alpha&milestone=m2&days=7`
5. With an unreadable snapshot for `alpha`, send `GET /api/reports/status?project=alpha` twice

**Expected:**
- Step 1 returns 404
- Steps 2, 3 and 4 return 422 without reading the snapshot
- Both requests in step 5 return 502 with an `error` and the failure is not cached
