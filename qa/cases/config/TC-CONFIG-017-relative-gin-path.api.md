# TC-CONFIG-017: Relative gin path

- **REQ:** REQ-CONFIG-010@8784f618
- **Priority:** medium

**Preconditions:**
- A config with `gin: {path: bin/gin}`

**Steps:**
1. Start the console

**Expected:**
- The console exits with a non-zero status
- The message names `gin.path`
