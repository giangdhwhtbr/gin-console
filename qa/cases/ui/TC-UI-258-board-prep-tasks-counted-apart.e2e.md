# TC-UI-258: Board prep tasks counted apart

- **REQ:** REQ-UI-031@5fa5ec1b
- **Priority:** medium

**Preconditions:**
- Project `alpha` has two blocked tracks and one blocked prep task (label `prep`)

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=board`

**Expected:**
- The Blocked column holds three cards
- The Blocked column header says "2 + 1 prep"
