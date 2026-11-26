# TC-MILESTONE-UI-126: Epics outside a milestone are grouped

- **REQ:** REQ-MILESTONE-UI-035@9f3f2236
- **Priority:** high

**Preconditions:**
- Project `gin-workflow` with 3 closed milestones and a `forecast` of 13 epics whose `milestone` is null, listed from "Task 13" down to "Task 01"

**Test data:**
- Today: 2026-11-26

**Steps:**
1. Open `/milestones?project=gin-workflow` with "Show closed" off

**Expected:**
- The only group is "Not in a milestone"
- It holds 13 epic rows in the order of `forecast.epics`, "Task 13" first and "Task 01" last
- No closed milestone is shown
