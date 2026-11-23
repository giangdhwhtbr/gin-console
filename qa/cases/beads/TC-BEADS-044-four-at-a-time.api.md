# TC-BEADS-044: Four at a time

- **REQ:** REQ-BEADS-016@ea0e7f1e
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-46-49-api
- **Checked:** 9360fc9b

**Preconditions:**
- Six projects are configured; the fake `bd dolt pull` takes a moment in each and records how many runs overlap

**Steps:**
1. Send `POST /api/refresh`

**Expected:**
- No more than four `bd dolt pull` processes ran at the same time
- All six projects were pulled
