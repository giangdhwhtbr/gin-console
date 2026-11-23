# TC-UI-104: Drill down and back

- **REQ:** REQ-UI-106@aef48e9b
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 555b8f92

**Preconditions:**
- Milestone `m2` with epic `e1` that has tasks, and epic `e2`

**Steps:**
1. Open `/beads?project=p&milestone=m2&view=graph`
2. Open epic `e1`
3. Choose `m2` in the breadcrumb

**Expected:**
- After opening `e1` the URL has `scope=e1` and the tasks of `e1` are drawn
- The breadcrumb reads `m2` › `e1`
- After choosing `m2` the epics of `m2` are drawn
