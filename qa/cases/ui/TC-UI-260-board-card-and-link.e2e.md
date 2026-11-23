# TC-UI-260: Board card and link

- **REQ:** REQ-UI-031@5fa5ec1b
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 698c07c4

**Preconditions:**
- Project `alpha` has ready P1 bead `t-1` assigned to `alice`

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=board`
2. Click the title of `t-1`

**Expected:**
- After step 1 the card of `t-1` shows the id, the title, the type, `P1`, the state "Ready" and `alice`
- After step 2 the page is `/beads/alpha/t-1`
