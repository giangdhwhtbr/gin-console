# TC-CONFIG-015: Set gin path

- **REQ:** REQ-CONFIG-010@8784f618
- **Priority:** medium

**Preconditions:**
- A config with `gin: {path: /opt/gin/gin}`

**Steps:**
1. Make the console run `gin state`

**Expected:**
- The process started is `/opt/gin/gin`
- Other tools such as `gin-qa` are still started by name
