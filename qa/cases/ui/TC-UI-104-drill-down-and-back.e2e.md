# TC-UI-104: Drill down and back

- **REQ:** REQ-UI-106@9683653c
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** b7702003

**Preconditions:**
- Milestone `m2` with epic `e1` that has tasks, and epic `e2`
- The window is 1440px wide

**Steps:**
1. Open `/beads?project=p&milestone=m2&view=graph`
2. Click the node of epic `e1`
3. Choose "Show children" in the details panel
4. Choose `m2` in the breadcrumb

**Expected:**
- After step 2 the URL has `select=e1` and the details panel shows `e1`
- After step 3 the URL has `scope=e1` and no `select`, the tasks of `e1` are drawn and no details panel is shown
- The breadcrumb reads `m2` › `e1`
- After step 4 the epics of `m2` are drawn
