# TC-REQUIREMENTS-026: Not numbered

- **REQ:** REQ-REQUIREMENTS-008@fec00dd2
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-25-57-api
- **Checked:** ec3ee106

**Preconditions:**
- A change folder holds `proposal.md` and `spec-delta.md`

**Steps:**
1. Send `GET /api/requirements/changes/proj/<change>`

**Expected:**
- The two texts are returned and no other
