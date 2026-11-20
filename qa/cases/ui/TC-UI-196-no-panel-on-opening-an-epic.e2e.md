# TC-UI-196: No panel on opening an epic

- **REQ:** REQ-UI-106@19fab77c
- **Priority:** medium

**Preconditions:**
- Project `example` with epic `ex-e12` that has children

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12`

**Expected:**
- The URL has no `select`
- No details panel is shown and the graph takes the full width
