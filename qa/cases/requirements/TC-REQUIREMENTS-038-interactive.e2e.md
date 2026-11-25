# TC-REQUIREMENTS-038: Interactive

- **REQ:** REQ-REQUIREMENTS-011@2f736f3a
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-32-34
- **Checked:** c3fa7bdd

**Preconditions:**
- The second console server of the previous case; `index.html` has a button and an inline script that writes "clicked" into the page

**Steps:**
1. Open `/requirements/mockups?project=m&mockup=ui/2026-11-22` on that server
2. Click the button of the mockup in the frame

**Expected:**
- The mockup shows "clicked"
