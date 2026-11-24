# TC-REPORTS-029: Behind pace

- **REQ:** REQ-REPORTS-013@cf4e7ed4
- **Priority:** high

**Preconditions:**
- `team.pace` 2.0 and `pace_needed` 3.4

**Test data:**
- None

**Steps:**
1. Open `/reports/team?project=alpha&milestone=m2`

**Expected:**
- The Pace figure reads "2.0 done per day" and "needs 3.4 done per day to finish by 27 Nov", in the warning color
