# TC-OVERVIEW-015: One person in two projects

- **REQ:** REQ-OVERVIEW-005@3c2a4a43
- **Priority:** high

**Preconditions:**
- Project `a` has one in-progress bead assigned to `ann`; project `b` has two assigned to `ann@example.com`

**Steps:**
1. Open `/`
2. Read the row of `ann` in Work in progress

**Expected:**
- One row reads `ann` with total 3
- It shows 1 in `a` and 2 in `b`
