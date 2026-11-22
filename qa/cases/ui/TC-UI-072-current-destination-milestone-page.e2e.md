# TC-UI-072: Current destination: Milestone page

- **REQ:** REQ-UI-057@92e2ae1c
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 9c043c38

**Preconditions:**
- Project `alpha` is stubbed with milestone `m-1`

**Steps:**
1. Open `/milestones/alpha/m-1`

**Expected:**
- Only the Milestones link in the main navigation has `aria-current="page"`
