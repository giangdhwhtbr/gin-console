# TC-UI-094: Reload

- **REQ:** REQ-UI-073@3fe05bd7
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 40e752fc

**Preconditions:**
- Project `a` with bead `a-1`

**Steps:**
1. Open `/beads?project=a&view=focus`
2. Open the bead page of `a-1`
3. Reload the page

**Expected:**
- The breadcrumb still returns to the Focus view
