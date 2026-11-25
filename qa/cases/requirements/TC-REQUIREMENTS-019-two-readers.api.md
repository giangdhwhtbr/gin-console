# TC-REQUIREMENTS-019: Two readers

- **REQ:** REQ-REQUIREMENTS-006@279f125e
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-25-57-api
- **Checked:** da9ba3cb

**Preconditions:**
- No answer of the trace is kept and the trace is slow

**Steps:**
1. Send `GET /api/requirements?project=proj` from two clients at once

**Expected:**
- `gin specs trace` runs once
- Both responses are 200
