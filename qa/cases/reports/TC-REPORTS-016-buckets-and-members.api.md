# TC-REPORTS-016: Buckets and members

- **REQ:** REQ-REPORTS-009@a8c235c2
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** 52e3d6d1

**Preconditions:**
- Project `alpha` has milestone `m2` with epic `e1`
- Epic `e1` has four child tasks: `e1.1` with status `blocked` and no assignee, `e1.2` with status `deferred` assigned to `ann`, `e1.3` with status `in_progress` assigned to `bao`, and `e1.4` with status `in_progress` assigned to `bao@example.com` with an open blocker

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha&milestone=m2`

**Expected:**
- The buckets of `e1.1`, `e1.2`, `e1.3` and `e1.4` are `open`, `open`, `in_progress` and `open`
- Their members are `Unassigned`, `ann`, `bao` and `bao`
- `e1.1` and `e1.4` have `blocked` true
