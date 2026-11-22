# TC-UI-201: Workflow unavailable

- **REQ:** REQ-UI-120@1a27452c
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-21T05-35-36
- **Checked:** f1faaece

**Preconditions:**
- The workflow request for `ex-e12` answers 502 with an error

**Steps:**
1. Open `/beads/example/ex-e12`

**Expected:**
- The Workflow card shows the error
- The Progress card is shown
- The Milestone card is shown
