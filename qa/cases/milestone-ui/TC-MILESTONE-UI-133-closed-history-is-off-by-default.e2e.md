# TC-MILESTONE-UI-133: Closed history is off by default

- **REQ:** REQ-MILESTONE-UI-037@9ec2b0af
- **Priority:** medium

**Preconditions:**
- Same project as TC-MILESTONE-UI-132 (`example`)

**Test data:**
- Today: 2026-11-12

**Steps:**
1. Open `/milestones?project=example`

**Expected:**
- "Show closed" is not checked and the URL has no `closed`
- No closed milestone and no closed epic is shown
- The open milestone `ex-m2` is shown
