# TC-REPORTS-097: Bug rows by epic

- **REQ:** REQ-REPORTS-042@a4436ebc
- **Priority:** high

**Preconditions:**
- Project `alpha` with `today` 2026-11-25 and the period 2026-11-18 to 2026-11-25
- Epic `e-1` with 1 bug opened in the period, `e-2` with 2 opened and 1 closed, `e-3` with 1 bug open since before the period, and 9 bugs of unknown source opened
- Epic `e-4` whose bugs were all opened and closed before the period

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/bugs?project=alpha&days=7`

**Expected:**
- `epics` lists `e-2`, `e-1`, `e-3` and the row with `id` `null`, in that order
- `e-3` has `opened` 0, `closed` 0 and `open_now` 1
- The sum of `opened` over the rows is `figures.opened`
- `epics` has no row for `e-4`
