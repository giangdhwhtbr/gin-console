# TC-MILESTONE-UI-134: No open work to forecast

- **REQ:** REQ-MILESTONE-UI-038@ccee82bf
- **Priority:** medium

**Preconditions:**
- Project `example` with closed milestones only and `forecast` null

**Test data:**
- Today: 2026-11-12

**Steps:**
1. Open `/milestones?project=example`
2. Turn on "Show closed"

**Expected:**
- After step 1: the Timeline says "No open work to forecast" and shows no milestone
- After step 2: it still says "No open work to forecast" and then shows the closed milestones
