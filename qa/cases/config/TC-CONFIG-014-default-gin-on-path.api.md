# TC-CONFIG-014: Default gin on PATH

- **REQ:** REQ-CONFIG-010@8784f618
- **Priority:** medium

**Preconditions:**
- A config without a `gin` section

**Steps:**
1. Make the console run `gin state`

**Expected:**
- The process started is `gin`, found on `PATH`
