# TC-REPORTS-083: Status verdict and sentence across milestone states

- **REQ:** REQ-REPORTS-027@2dfab036
- **Priority:** high

**Preconditions:**
- Project `alpha` on Monday 2026-11-23
- Active milestone `m2` ending Wednesday 2 Dec, 20 open beads, `pace` 2.0, 1 blocked bead, forecast `finish` 30 Nov, 4 open epics without tracks
- Planned milestone `m3` starting 18 Dec with 13 points planned
- Closed milestone `m1` ending Friday 30 Oct, closed Tuesday 3 Nov
- Active milestone `m4` ending 2 Dec with no blocked beads and forecast `finish` 17 Feb 2027

**Test data:**
- None

**Steps:**
1. Open `/reports/status?project=alpha&milestone=m2`
2. Open `/reports/status?project=alpha&milestone=m3`
3. Open `/reports/status?project=alpha&milestone=m1`
4. Open `/reports/status?project=alpha&milestone=m4`

**Expected:**
- For `m2`, verdict reads "At risk" and "At today's pace the 20 open beads close around 7 Dec, 3 working days after the end. The epic estimates finish on 30 Nov; 4 epics are not split into tasks yet."
- For `m3`, verdict reads "Not started" and "Starts on 18 Dec, with 13 points planned."
- For `m1`, verdict reads "Finished 2 d late" and "Closed on 3 Nov, 2 working days after the end."
- For `m4`, verdict reads "Late"
