# TC-UI-196: No panel on opening an epic

- **REQ:** REQ-UI-106@9683653c
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 9eb475a0

**Preconditions:**
- Project `example` with epic `ex-e12` that has children, among them `ex-e12.2`
- The window is 1440px wide

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12`
2. Click the card of `ex-e12.2`

**Expected:**
- After step 1 the URL has no `select`, no details panel is shown and the graph takes the full width
- After step 2 the URL has `select=ex-e12.2` and the details panel shows `ex-e12.2`
