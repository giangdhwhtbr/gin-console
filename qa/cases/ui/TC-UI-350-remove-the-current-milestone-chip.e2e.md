# TC-UI-350: Remove the current milestone chip

- **REQ:** REQ-UI-144@6edc5604
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** b2d7ea36

**Preconditions:**
- Project `example` is stubbed with current milestone `ex-m2` titled "Checkout v2"
- URL has no `milestone`
- Window 1440px wide

**Steps:**
1. Open `/beads?project=example`
2. Click `button "Remove Milestone filter"`

**Expected:**
- Before the click the chip reads "Milestone Checkout v2 ×"
- After the click the URL has `milestone=all`
- The filter is `button "Milestone"`
- Every bead is shown
