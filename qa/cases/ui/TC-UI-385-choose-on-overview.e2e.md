# TC-UI-385: Choose on Overview

- **REQ:** REQ-UI-123@74fc3d51
- **Priority:** medium

**Preconditions:**
- Projects `a` and `b` are configured and the current project is `a`

**Steps:**
1. Open `/`
2. Choose project `b` in the project switcher

**Expected:**
- The URL stays `/` and the Overview page keeps its content
- The links of the "Main" navigation go to the pages of project `b`
