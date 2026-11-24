# TC-REPORTS-079: Status risks blocked chain, cap at five and unestimated epics

- **REQ:** REQ-REPORTS-025@e0dd8c74
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-24T03-52-06-api
- **Checked:** 5bd9f646

**Preconditions:**
- Project `alpha`, `today` 2026-11-23, active milestone `m2`
- 7 blocked scope beads: `t-3` ("End-to-end checkout QA") waiting 4 working days on open bead `t-8` ("Mobile layout", assigned to `bao@example.com`, itself waiting on open `t-9`), `t-4` with status `blocked` and no open blocker waiting 3 working days, and 5 more blocked beads with shorter waits
- Open epics `e-5` and `e-7` without points, and closed epic `e-3` without points

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/status?project=alpha&milestone=m2`

**Expected:**
- `risks.blocked` holds the 5 beads that waited longest and `risks.blocked_more` is 2
- `t-3` has `days` 4 and `blocker` `t-8` with `person` `bao` and `blocked` `true`
- `t-4` has `blocker` `null`
- `risks.unestimated` holds `e-5` and `e-7` (and not closed `e-3`)
