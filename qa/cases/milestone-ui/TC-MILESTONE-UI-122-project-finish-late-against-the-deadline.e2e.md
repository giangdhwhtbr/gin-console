# TC-MILESTONE-UI-122: Project finish late against the deadline

- **REQ:** REQ-MILESTONE-UI-034@9fbc206a
- **Priority:** high

**Preconditions:**
- Project `gin-workflow` whose `forecast` has `finish` 2026-12-22, `deadline` 2026-12-11 and `overflow_days` 7

**Test data:**
- Today: 2026-11-26

**Steps:**
1. Open `/milestones?project=gin-workflow`
2. Open `/milestones?project=gin-workflow&view=list`

**Expected:**
- After step 1: under the title the header reads "Project finishes 22 Dec", "deadline 11 Dec" and "7 working days late"
- After step 1: "7 working days late" is in the warning color and has a warning icon
- After step 2: the same header is shown above the list
