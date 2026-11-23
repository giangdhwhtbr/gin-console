# TC-UI-039: Default to the current milestone

- **REQ:** REQ-UI-104@8a28fc31
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** b9699725

**Preconditions:**
- Project `alpha` whose current milestone is `m2`, with open beads under `m2`, open beads under planned milestone `m3`, and one open bead under no milestone

**Steps:**
1. Open `/beads?project=alpha`

**Expected:**
- Only the beads under `m2` are shown
- The Milestone filter is the chip `button "Milestone <title of m2>"` with its "×" `button "Remove Milestone filter"`
