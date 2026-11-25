# TC-REQUIREMENTS-031: Parent path

- **REQ:** REQ-REQUIREMENTS-010@89434c84
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-25-57-api
- **Checked:** 22c912de

**Preconditions:**
- A confirmed folder `ui/2026-11-22` and a file `docs/specs/ui/spec.md` above it

**Steps:**
1. Send `GET /api/requirements/mockups/proj/files/ui/2026-11-22/..%2f..%2fspec.md`

**Expected:**
- The response is 404
