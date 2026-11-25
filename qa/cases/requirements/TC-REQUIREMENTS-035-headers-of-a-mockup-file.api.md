# TC-REQUIREMENTS-035: Headers of a mockup file

- **REQ:** REQ-REQUIREMENTS-011@2f736f3a
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-25-57-api
- **Checked:** cdeb1a02

**Preconditions:**
- A confirmed folder holds `index.html`

**Steps:**
1. Send `GET /api/requirements/mockups/proj/files/ui/2026-11-22/index.html`

**Expected:**
- `X-Content-Type-Options` is `nosniff`
- `Content-Security-Policy` is `sandbox allow-scripts; connect-src 'none'; form-action 'none'; frame-src 'none'`
