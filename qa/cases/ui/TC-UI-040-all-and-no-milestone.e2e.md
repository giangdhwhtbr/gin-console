# TC-UI-040: All and No milestone

- **REQ:** REQ-UI-104@3cd94953
- **Priority:** medium

**Preconditions:**
- Project `alpha` whose current milestone is `m2`, with open beads under `m2`, open beads under planned milestone `m3`, and one open bead under no milestone

**Steps:**
1. Open `/beads?project=alpha`
2. Choose `All` in the Milestone select
3. Choose `No milestone` in the Milestone select

**Expected:**
- After step 2 every open bead is shown and the URL has `milestone=all`
- After step 3 only the bead under no milestone is shown and the URL has `milestone=none`
