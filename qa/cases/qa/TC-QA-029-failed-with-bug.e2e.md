# TC-QA-029: Failed with bug

- **REQ:** REQ-QA-010@c04a7b48
- **Priority:** high

**Preconditions:**
- Case `TC-UI-115` failed with `bug` `gin-console-3kd` and case `TC-UI-116` passed with `bug` `gin-console-4aa`

**Steps:**
1. Open `/tests?project=alpha`
2. Choose the result "Failed" in the filters

**Expected:**
- `TC-UI-115` is listed with a link to `/beads/alpha/gin-console-3kd`
- `TC-UI-116` is not listed
