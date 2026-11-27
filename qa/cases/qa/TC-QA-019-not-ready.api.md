# TC-QA-019: Not ready

- **REQ:** REQ-QA-008@9734b99b
- **Priority:** high

**Preconditions:**
- Milestone `m2` whose requirement `REQ-UI-001` has `TC-UI-001` (`passed`) and `TC-UI-002` (`outdated`), whose requirement `REQ-UI-002` has no case, with an open P1 bug from `e1`, an open P0 bug of unknown source, an open P1 bug from `e9` of another milestone, and epic `e2` whose `implementation_complete` is unmet

**Steps:**
1. Send `GET /api/qa/readiness/alpha/m2`

**Expected:**
- `cases` fails listing `REQ-UI-002`
- `results` fails listing `TC-UI-002` as `outdated`
- `bugs` fails listing the two bugs and not the one of `e9`
- `gates` fails listing `e2` at `implementation_complete`
- The verdict is `not_ready`
