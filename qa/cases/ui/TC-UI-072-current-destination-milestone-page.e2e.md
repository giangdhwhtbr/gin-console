# TC-UI-072: Current destination: Milestone page

- **REQ:** REQ-UI-057@f37002dd
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-32-34
- **Checked:** 36bfe868

**Preconditions:**
- Project `alpha` is stubbed with milestone `m-1`

**Steps:**
1. Open `/milestones/alpha/m-1`

**Expected:**
- Only the Milestones link in the main navigation has `aria-current="page"`
