# TC-REQUIREMENTS-037: Script calls the API

- **REQ:** REQ-REQUIREMENTS-011@67443d75
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-26T14-15-50
- **Checked:** b9b49655

**Preconditions:**
- A second console server runs on a free port with a temporary config holding project `m` whose folder `docs/specs/ui/assets/2026-11-22` is confirmed
- Its `index.html` holds a script that calls `fetch('/api/projects/beads')` and `fetch('/api/refresh', { method: 'POST', mode: 'no-cors' })` and writes the outcome of each into the page

**Steps:**
1. Open `/requirements/mockups?project=m&mockup=ui/2026-11-22` on that server
2. Read the outcome the mockup shows in the frame
3. Open the mockup file in its own tab
4. Read the outcome the mockup shows in that tab

**Expected:**
- The frame has the `sandbox` attribute `allow-scripts` and nothing else
- Both calls fail in the frame and in the tab
- The server log shows no `POST /api/refresh` and no `GET /api/projects/beads` from the mockup
