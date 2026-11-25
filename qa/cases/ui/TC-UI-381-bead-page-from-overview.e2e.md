# TC-UI-381: Bead page from Overview

- **REQ:** REQ-UI-057@519df087
- **Priority:** high

**Preconditions:**
- Projects `a` and `b` are configured and bead `a-1` is in project `a`

**Steps:**
1. Open `/`
2. Click the link of `a-1` in a list

**Expected:**
- The bead page of `a-1` is shown
- Only the Overview link of the "Main" navigation has `aria-current="page"`
