# TC-MILESTONE-UI-119: Unreadable export falls back to the list counts

- **REQ:** REQ-MILESTONE-UI-025@5673e6e2
- **Priority:** medium

**Preconditions:**
- Project `alpha` whose `gin milestone list` reports milestone `m2` with `epics` `{total: 3, closed: 1}`, and whose `bd export` fails or cannot be read

**Test data:**
- None

**Steps:**
1. Send `GET /api/milestones?project=alpha`

**Expected:**
- The response is 200 and lists `m2`
- `m2` has `epics` `{total: 3, closed: 1, in_progress: 0, blocked: 0, ready: 2, deferred: 0}`
