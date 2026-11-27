# TC-AUTH-055: Grant with auth off

- **REQ:** REQ-AUTH-016@9b0a0c99
- **Priority:** medium

**Preconditions:**
- Auth is off; project `a` has a confirmed folder `ui/2026-11-22` with `style.css`

**Steps:**
1. Request `GET /api/requirements/mockups?project=a`
2. Request a grant path `/api/requirements/mockups/a/g/x.y/files/ui/2026-11-22/style.css`
3. Request `/api/requirements/mockups/a/files/ui/2026-11-22/style.css`

**Expected:**
- Every mockup in the list has `grant` null
- The grant path answers 404
- The path without `g/` serves the file
