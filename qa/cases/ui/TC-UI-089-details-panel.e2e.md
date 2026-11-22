# TC-UI-089: Details panel

- **REQ:** REQ-UI-072@b8e02f9d
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 5809b8e9

**Preconditions:**
- Project `a` with bead `a-1`

**Steps:**
1. Open `/beads?project=a`
2. Select `a-1` in the List view

**Expected:**
- The details panel of `a-1` has no breadcrumb
- The details panel keeps its "Open page" link
