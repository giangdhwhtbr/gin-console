# TC-BEADS-088: Image limit

- **REQ:** REQ-BEADS-026@8e331dd0
- **Priority:** low
- **Result:** passed
- **Run:** qa/evidence/2026-11-27T00-00-02-api
- **Checked:** be1c4fcf

**Preconditions:**
- Bead `b-1` in project `p` whose description names 60 different PNG paths

**Steps:**
1. Send `GET /api/beads/p/b-1`

**Expected:**
- `images` holds the first 50, numbered 1 to 50
