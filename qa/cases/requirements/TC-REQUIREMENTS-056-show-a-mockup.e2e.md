# TC-REQUIREMENTS-056: Show a mockup

- **REQ:** REQ-REQUIREMENTS-018@96db2f86
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-32-34
- **Checked:** 7c14e2ba

**Preconditions:**
- A confirmed folder `ui` `2026-11-22` holds `mockup/index.html`, confirmed by `ba`, used by `REQ-UI-129`

**Steps:**
1. Open `/requirements/mockups?project=a`
2. Choose the folder

**Expected:**
- The folder is listed with its date, confirmation date, person and the requirement id as a link
- The description, the control for `mockup/index.html`, the link "Open in a new tab" and the mockup in the frame are shown
- The URL holds `mockup=ui/2026-11-22`
