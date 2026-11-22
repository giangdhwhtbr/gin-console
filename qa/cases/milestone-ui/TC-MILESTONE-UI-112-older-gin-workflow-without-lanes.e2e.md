# TC-MILESTONE-UI-112: Older gin-workflow without lanes

- **REQ:** REQ-MILESTONE-UI-001@6e63a57f
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T04-57-11
- **Checked:** f335a890

**Preconditions:**
- Project `P` whose `milestone list` entries have no `lanes` key

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/milestones?project=P`

**Expected:**
- Each row shows "–" for Parallel lanes
- The rest of each row is shown as before
