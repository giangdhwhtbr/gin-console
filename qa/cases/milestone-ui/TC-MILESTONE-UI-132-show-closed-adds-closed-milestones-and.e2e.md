# TC-MILESTONE-UI-132: Show closed adds closed milestones and epics

- **REQ:** REQ-MILESTONE-UI-037@9ec2b0af
- **Priority:** high

**Preconditions:**
- Project `example` with closed milestones `ex-m0a` "Discovery", `ex-m0b` "Prototype" (finish 2026-10-13) and `ex-m1` "Foundations", closed epic `ex-e2` "Search relevance" of `ex-m1` started 2026-10-12 and closed 2026-10-28, and open milestone `ex-m2` "Beta readiness" with one forecast epic

**Test data:**
- Today: 2026-11-12

**Steps:**
1. Open `/milestones?project=example`
2. Turn on "Show closed"

**Expected:**
- After step 2: the URL has `closed=1` and "Show closed" is checked
- The three closed milestones come first, then `ex-m2`
- `ex-m0b` reads "Finished 13 Oct"
- `ex-e2` is a row under `ex-m1` with a Done bar from 12 Oct to 28 Oct (17 days, 102 px wide) named "Search relevance: 12 Oct – 28 Oct, closed"
