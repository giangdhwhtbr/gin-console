# TC-UI-200: Workflow stage

- **REQ:** REQ-UI-120@39a3c2e0
- **Priority:** medium

**Preconditions:**
- The workflow request for `ex-e12` answers stage `execute`, 4 of 6 gates satisfied, no warnings and no waivers

**Steps:**
1. Open `/beads/example/ex-e12`

**Expected:**
- The stages discuss, plan and orchestrate are ticked
- The stage execute is marked
- The stage ship is plain
- Gates reads "4 of 6 satisfied"
- Warnings and Waivers read "none"
