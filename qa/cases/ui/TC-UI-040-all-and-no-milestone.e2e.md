# TC-UI-040: All and No milestone

- **REQ:** REQ-UI-104@8a28fc31
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** f44e1127

**Preconditions:**
- Project `alpha` whose current milestone is `m2`, with open beads under `m2`, open beads under planned milestone `m3`, and one open bead under no milestone

**Steps:**
1. Open `/beads?project=alpha`
2. Open the Milestone chip and choose `radio "All"` in `radiogroup "Milestone"`
3. Open `button "Milestone"` and choose `radio "No milestone"` in `radiogroup "Milestone"`

**Expected:**
- After step 2 every open bead is shown, the URL has `milestone=all` and the filter is `button "Milestone"` without a value
- After step 3 only the bead under no milestone is shown, the URL has `milestone=none` and the chip reads `Milestone No milestone`
