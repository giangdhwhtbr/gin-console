# TC-UI-261: Board empty column

- **REQ:** REQ-UI-031@5fa5ec1b
- **Priority:** low
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T04-57-11
- **Checked:** dcf6d30c

**Preconditions:**
- Project `alpha` has beads but none of them is blocked

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=board`

**Expected:**
- The Blocked column says "No beads"
