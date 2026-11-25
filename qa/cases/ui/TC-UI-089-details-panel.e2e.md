# TC-UI-089: Details panel

- **REQ:** REQ-UI-072@d77e4fb2
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 5b59f090

**Preconditions:**
- Project `a` with bead `a-1`

**Steps:**
1. Set the window width to 1280px
2. Open `/beads?project=a`
3. Click the row of `a-1` outside its title in the List view

**Expected:**
- The details panel of `a-1` has no breadcrumb
- The details panel keeps its "Open page" link
