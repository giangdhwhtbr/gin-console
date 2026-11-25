# TC-OVERVIEW-032: Narrow window

- **REQ:** REQ-OVERVIEW-011@de69ba7f
- **Priority:** high

**Preconditions:**
- The window is 360px wide
- A project name of 60 characters and a blocked bead with a blocker, an assignee and a wait

**Test data:**
- Project name: 60 characters without a space

**Steps:**
1. Open `/`

**Expected:**
- The scroll width of the page does not exceed its client width
- The row shows the bead, project, assignee, wait, blocker and the blocker's person
- The five links of the "Main" navigation are at least 44px high and wide and their labels are not clipped
