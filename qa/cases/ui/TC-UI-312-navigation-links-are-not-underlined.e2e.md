# TC-UI-312: Navigation links are not underlined

- **REQ:** REQ-UI-139@fbddf5e1
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 7c8f8d0c

**Preconditions:**
- Project `P` reports epic `ex-e12` and the Beads List shows it

**Steps:**
1. Open `/beads?project=P&view=list`
2. Click the title of `ex-e12`
3. Move the pointer onto the breadcrumb link "Beads"
4. Read the computed `text-decoration-line` and `color` of the link

**Expected:**
- The link is not underlined (`text-decoration-line` is `none`)
- The text colour of the link is the identity colour (amethyst) of the theme
