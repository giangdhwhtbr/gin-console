# TC-UI-256: Board placement

- **REQ:** REQ-UI-031@5fa5ec1b
- **Priority:** high

**Preconditions:**
- Project `alpha` has a deferred bead, a ready bead, an in-progress bead, a blocked bead and a closed bead, none of them a prep task

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=board`
2. Turn on "Show closed"

**Expected:**
- After step 2 each of the five beads is in its own column: Backlog, Ready, In Progress, Blocked and Done
- After step 2 each column header says 1
