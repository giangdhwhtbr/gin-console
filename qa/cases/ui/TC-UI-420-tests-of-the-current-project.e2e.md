# TC-UI-420: Tests of the current project

- **REQ:** REQ-UI-124@79a26394
- **Priority:** medium

**Preconditions:**
- Projects `b` and `c` are configured and the current project is `b`

**Steps:**
1. Open `/tests`
2. Open `/tests/c/TC-UI-001`

**Expected:**
- The Tests page of `b` is shown and the URL becomes `/tests?project=b`
- After the case page the current project is `c`
