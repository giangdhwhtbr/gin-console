# TC-UI-257: Board blocked first

- **REQ:** REQ-UI-031@5fa5ec1b
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** da23ff11

**Preconditions:**
- Project `alpha` has an in-progress bead and a deferred bead, each with an open blocker

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=board`

**Expected:**
- Both beads are in the Blocked column
- The In Progress and Backlog columns do not hold them
