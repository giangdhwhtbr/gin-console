# TC-UI-148: Badges and facts

- **REQ:** REQ-UI-028@5a22703b
- **Priority:** medium

**Preconditions:**
- In-progress P1 epic `e-3` of project `alpha` with `points: 5`, `points_reason: "new endpoint and UI"`, owner `lead@example.com`, assignee `bao`, created by `lead`, created and updated at 2026-05-11 16:00:00 and 0 comments
- The browser date is in 2026

**Steps:**
1. Open `/beads/alpha/e-3`

**Expected:**
- The badge row shows "In progress", "P1" and "5 pt"
- The line under the badge row reads "new endpoint and UI"
- The facts read Assignee "bao", Created by "lead", Created "11 May, 16:00", Updated "11 May, 16:00" and Comments "0"
- No Owner fact is shown
- Each label is in the muted color and each value in the text color
