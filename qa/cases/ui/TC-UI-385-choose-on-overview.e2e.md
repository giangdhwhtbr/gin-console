# TC-UI-385: Choose on Overview

- **REQ:** REQ-UI-123@1d5f1e95
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-32-34
- **Checked:** 3d3955b8

**Preconditions:**
- Projects `a` and `b` are configured and the current project is `a`

**Steps:**
1. Open `/`
2. Choose project `b` in the project switcher

**Expected:**
- The URL stays `/` and the Overview page keeps its content
- The links of the "Main" navigation go to the pages of project `b`
