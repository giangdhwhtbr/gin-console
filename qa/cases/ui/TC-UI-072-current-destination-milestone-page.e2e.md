# TC-UI-072: Current destination: Milestone page

- **REQ:** REQ-UI-057@519df087
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 07b85471

**Preconditions:**
- Project `alpha` is stubbed with milestone `m-1`

**Steps:**
1. Open `/milestones/alpha/m-1`

**Expected:**
- Only the Milestones link in the main navigation has `aria-current="page"`
