# TC-UI-094: Reload

- **REQ:** REQ-UI-073@9e85a65b
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-32-34
- **Checked:** a848fd20

**Preconditions:**
- Project `a` with bead `a-1`

**Steps:**
1. Open `/beads?project=a&view=focus`
2. Open the bead page of `a-1`
3. Reload the page

**Expected:**
- The breadcrumb still returns to the Focus view
