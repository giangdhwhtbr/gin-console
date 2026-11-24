# TC-UI-078: Quality figures

- **REQ:** REQ-UI-091@1e16f3d0
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 204f1d3c

**Preconditions:**
- The Rework section of the Reports page for `alpha`
- Member rows `ann` (4 closed, 1 reopen) and `bao` (1 closed, 1 bug) and `totals.rework_rate` 0.4
- The window is 900px wide, so the page shows its row of section links

**Test data:**
- None

**Steps:**
1. Open `/reports/rework?project=alpha`

**Expected:**
- The figures read "40%", 1 reopen and 1 bug found later
- Each figure has a tooltip naming its source
- The member table lists `ann` and `bao` with closed, reopens, bugs and rework rate
- The page shows no tokens, review cycles, rejections, findings or waivers
