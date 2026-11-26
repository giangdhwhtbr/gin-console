# TC-MILESTONE-UI-135: Milestone without open epics

- **REQ:** REQ-MILESTONE-UI-038@ccee82bf
- **Priority:** medium

**Preconditions:**
- Project `example` with chained milestone `ex-m4` "Hardening" (planned, 14 Dec 2026 to 8 Jan 2027) whose `forecast.milestones` entry has `start` and `finish` null

**Test data:**
- Today: 2026-11-26

**Steps:**
1. Open `/milestones?project=example`

**Expected:**
- The row of `ex-m4` shows its bar for 14 Dec to 8 Jan and "No open epics"
- The row shows no hatched part
