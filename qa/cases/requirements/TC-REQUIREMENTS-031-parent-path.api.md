# TC-REQUIREMENTS-031: Parent path

- **REQ:** REQ-REQUIREMENTS-010@1ea0e060
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T23-57-24-api
- **Checked:** 37e0d54a

**Preconditions:**
- A confirmed folder `ui/2026-11-22` and a file `docs/specs/ui/spec.md` above it

**Steps:**
1. Send `GET /api/requirements/mockups/proj/files/ui/2026-11-22/..%2f..%2fspec.md`

**Expected:**
- The response is 404
