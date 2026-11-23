# TC-UI-078: Quality figures

- **REQ:** REQ-UI-091@6dedf223
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 204f1d3c

**Preconditions:**
- The Quality tab of the Reports page for `alpha`
- Member rows `ann` (4 closed, 1 reopen) and `bao` (1 closed, 1 bug) and `totals.rework_rate` 0.4
- The window is 900px wide, so the page shows its tab list

**Test data:**
- None

**Steps:**
1. Open `/reports?project=alpha&tab=quality`

**Expected:**
- The figures read "40%", 1 reopen and 1 bug found later
- Each figure has a tooltip naming its source
- The member table lists `ann` and `bao` with closed, reopens, bugs and rework rate
- The page shows no tokens, review cycles, rejections, findings or waivers
