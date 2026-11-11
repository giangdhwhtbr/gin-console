# TC-UI-001: Bugs found lists open and closed bugs with links

- **REQ:** REQ-UI-086@4075d745
- **Priority:** high

**Preconditions:**
- Project P; bead P-1 has a bug P-2 (open) and a bug P-3 (closed), each with a `discovered-from` dependency on P-1, so the bead detail has `bugs` with both

**Steps:**
1. Open /beads/P/P-1

**Expected:**
- A "Bugs found" section lists P-2 and P-3 with id, title and status
- Each row links to `/beads/P/<its id>`
