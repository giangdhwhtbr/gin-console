# TC-REQUIREMENTS-061: Elements request the API

- **REQ:** REQ-REQUIREMENTS-011@67443d75
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-26T14-15-50
- **Checked:** 67b71ffc

**Preconditions:**
- A second console server runs on a free port with a temporary config holding project `m` whose folder `docs/specs/ui/assets/2026-11-22` is confirmed
- Its `index.html` holds `<img src="/api/projects/beads?from=img">` and `<script src="/api/projects/beads?from=script"></script>`

**Steps:**
1. Open `/requirements/mockups?project=m&mockup=ui/2026-11-22` on that server
2. Open the mockup file in its own tab
3. Read the server log

**Expected:**
- The server log shows `GET /api/projects/beads?from=img` and `GET /api/projects/beads?from=script` answered 403, once from the frame and once from the tab
- It shows neither answered 200
