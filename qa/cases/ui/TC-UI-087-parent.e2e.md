# TC-UI-087: Parent

- **REQ:** REQ-UI-072@6a1a0b98
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 819620fc

**Preconditions:**
- Project `a` with bead `a-1` titled "Checkout" and its child `a-2`

**Steps:**
1. Open the bead page of `a-2`

**Expected:**
- The breadcrumb has a link "Checkout" to `/beads/a/a-1` before the title of `a-2`
