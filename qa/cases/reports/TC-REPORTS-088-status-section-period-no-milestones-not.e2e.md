# TC-REPORTS-088: Status section period, no milestones, not started and retry

- **REQ:** REQ-REPORTS-032@0b7f748c
- **Priority:** high

**Preconditions:**
- Project `alpha` with period 30 days (5 closed, rework 0.2, 1 blocked) and planned milestone `m3` starting 18 Dec with empty `burnup`
- Project `beta` with no milestones
- For retry, `/api/reports/status` for `alpha` returns 502 once then 200

**Test data:**
- None

**Steps:**
1. Open `/reports/status?project=alpha&days=30`
2. Open `/reports/status?project=beta&days=30`
3. Open `/reports/status?project=alpha&milestone=m3`
4. With 502 on first request, open `/reports/status?project=alpha&milestone=m2` and press Retry

**Expected:**
- Step 1 shows "5 closed", "20%", "1", no verdict, and "Pick a milestone to see the verdict, burn-up and epics"
- Step 2 says "beta has no milestones yet" and offers to copy `gin milestone create`
- Step 3 shows verdict "Not started" and "Starts 18 Dec" in place of the burn-up
- Step 4 shows the error with Retry, and after Retry shows the report
