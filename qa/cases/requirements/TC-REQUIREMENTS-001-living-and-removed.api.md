# TC-REQUIREMENTS-001: Living and removed

- **REQ:** REQ-REQUIREMENTS-001@d2023c02
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-33-21-api
- **Checked:** 30fb77e7

**Preconditions:**
- Project `proj` is configured; `gin specs trace --all --format json` reports one living and one removed requirement

**Steps:**
1. Send `GET /api/requirements?project=proj`

**Expected:**
- Both requirements are returned with their state
- The removed one has no status
