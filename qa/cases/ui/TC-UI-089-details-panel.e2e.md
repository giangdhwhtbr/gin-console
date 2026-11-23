# TC-UI-089: Details panel

- **REQ:** REQ-UI-072@6a1a0b98
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 3bd25360

**Preconditions:**
- Project `a` with bead `a-1`

**Steps:**
1. Open `/beads?project=a`
2. Select `a-1` in the List view

**Expected:**
- The details panel of `a-1` has no breadcrumb
- The details panel keeps its "Open page" link
