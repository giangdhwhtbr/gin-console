# TC-REQUIREMENTS-038: Interactive

- **REQ:** REQ-REQUIREMENTS-011@67443d75
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-26T14-15-34
- **Checked:** d51d7179

**Preconditions:**
- The second console server of the previous case; `index.html` has a button and an inline script that writes "clicked" into the page

**Steps:**
1. Open `/requirements/mockups?project=m&mockup=ui/2026-11-22` on that server
2. Click the button of the mockup in the frame

**Expected:**
- The mockup shows "clicked"
