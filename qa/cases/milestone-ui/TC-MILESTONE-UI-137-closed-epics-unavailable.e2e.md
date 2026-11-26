# TC-MILESTONE-UI-137: Closed epics unavailable

- **REQ:** REQ-MILESTONE-UI-038@ccee82bf
- **Priority:** medium

**Preconditions:**
- Project `example` with closed milestone `ex-m1` "Foundations", open milestone `ex-m2` and a `closed_epics` of null

**Test data:**
- Today: 2026-11-12

**Steps:**
1. Open `/milestones?project=example`
2. Turn on "Show closed"

**Expected:**
- After step 1: "Closed epics unavailable" is not shown
- After step 2: the Timeline says "Closed epics unavailable: Beads could not be read" and still shows the closed milestone `ex-m1`
