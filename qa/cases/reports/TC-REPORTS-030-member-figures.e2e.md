# TC-REPORTS-030: Member figures

- **REQ:** REQ-REPORTS-013@cf4e7ed4
- **Priority:** medium

**Preconditions:**
- Member `ann` with scope 11, closed 6 and 1 blocked bead

**Test data:**
- None

**Steps:**
1. Open `/reports/team?project=alpha&milestone=m2`
2. Select `ann` in the Member select

**Expected:**
- The Done figure reads "6 of 11" and "55% of assigned"
- The Open figure reads "1 blocked"
- Throughput is shown instead of Pace
