# TC-UI-196: No panel on opening an epic

- **REQ:** REQ-UI-106@aef48e9b
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** c6b0171f

**Preconditions:**
- Project `example` with epic `ex-e12` that has children

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12`

**Expected:**
- The URL has no `select`
- No details panel is shown and the graph takes the full width
