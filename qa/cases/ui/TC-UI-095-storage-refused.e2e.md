# TC-UI-095: Storage refused

- **REQ:** REQ-UI-073@99c2938a
- **Priority:** low
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** bdc842d3

**Preconditions:**
- Project `a` with bead `a-1`; the browser throws when the place is stored (session storage stubbed to throw)

**Steps:**
1. Open `/beads?project=a&view=board`
2. Open the bead page of `a-1`
3. Use the first link of the breadcrumb

**Expected:**
- The remembered place of this visit is used
- No error is shown
