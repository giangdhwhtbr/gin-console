# TC-MILESTONE-UI-124: Forecast unavailable shows the error

- **REQ:** REQ-MILESTONE-UI-034@9fbc206a
- **Priority:** medium

**Preconditions:**
- Project `gin-workflow` whose `forecast` has `error` "dependency cycle: e-1 -> e-2 -> e-1"

**Test data:**
- Today: 2026-11-26

**Steps:**
1. Open `/milestones?project=gin-workflow`

**Expected:**
- The header reads "Forecast unavailable: dependency cycle: e-1 -> e-2 -> e-1" in the destructive color
- "Project finishes" is not shown
