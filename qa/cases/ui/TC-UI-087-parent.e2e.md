# TC-UI-087: Parent

- **REQ:** REQ-UI-072@bb47458a
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T23-57-16
- **Checked:** 9270c7be

**Preconditions:**
- Project `a` with bead `a-1` titled "Checkout" and its child `a-2`

**Steps:**
1. Open the bead page of `a-2`

**Expected:**
- The breadcrumb has a link "Checkout" to `/beads/a/a-1` before the title of `a-2`
