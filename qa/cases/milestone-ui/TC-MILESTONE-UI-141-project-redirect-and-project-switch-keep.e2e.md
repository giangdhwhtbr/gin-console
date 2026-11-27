# TC-MILESTONE-UI-141: Project redirect and project switch keep view and closed

- **REQ:** REQ-MILESTONE-UI-033@4e0cb01a
- **Priority:** medium

**Preconditions:**
- Projects `a` and `b`, each with one milestone (`Alpha launch` in `a`, `Beta launch` in `b`); `a` comes first in the list

**Steps:**
1. Open `/milestones?view=list&closed=1&zoom=weeks`
2. Open the project switcher and choose `b`

**Expected:**
- After step 1: the URL is `/milestones?view=list&closed=1&zoom=weeks&project=a` (the project is added in place, nothing else is dropped), and the list of milestones is shown, not the Timeline
- After step 2: the URL has `project=b`, `view=list` and `closed=1`, and no `zoom`
- After step 2: the list shows `Beta launch`
