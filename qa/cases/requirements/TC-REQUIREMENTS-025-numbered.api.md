# TC-REQUIREMENTS-025: Numbered

- **REQ:** REQ-REQUIREMENTS-008@fec00dd2
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-25-57-api
- **Checked:** 2a1e2521

**Preconditions:**
- A change folder holds `01-proposal.md` to `05-tests.md`

**Steps:**
1. Send `GET /api/requirements/changes/proj/<change>`

**Expected:**
- The five texts are returned under proposal, spec-delta, design, plan and tests
