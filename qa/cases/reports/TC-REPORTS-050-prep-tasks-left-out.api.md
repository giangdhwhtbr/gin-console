# TC-REPORTS-050: Prep tasks left out

- **REQ:** REQ-REPORTS-009@a8c235c2
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** d5e9bbb0

**Preconditions:**
- Project `alpha` has milestone `m2`
- Epic `e-1` has parent `m2`, tracks `t-1` and `t-2`, and prep task `p-1` labelled `prep` and `prep:mockup`
- Epic `e-2` has parent `m2` and one child only, prep task `p-2` labelled `prep`

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=alpha&milestone=m2`

**Expected:**
- `beads` holds `t-1`, `t-2` and `e-2`
- `e-2` has itself as its epic
- `beads` holds none of `e-1`, `p-1` and `p-2`
