# TC-UI-381: Bead page from Overview

- **REQ:** REQ-UI-057@f37002dd
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-32-34
- **Checked:** c05d4eb2

**Preconditions:**
- Projects `a` and `b` are configured and bead `a-1` is in project `a`

**Steps:**
1. Open `/`
2. Click the link of `a-1` in a list

**Expected:**
- The bead page of `a-1` is shown
- Only the Overview link of the "Main" navigation has `aria-current="page"`
