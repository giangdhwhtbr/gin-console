# TC-REPORTS-051: Long options on a phone

- **REQ:** REQ-REPORTS-012@023dc4c5
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 6f2bdbbf

**Preconditions:**
- Project `alpha` has a milestone titled with 120 characters and a member `nguyen.thi.thanh.huong.payments-team@example-company.com.vn`
- The browser window is 390px wide

**Steps:**
1. Open `/reports?project=alpha&tab=team`

**Expected:**
- The Milestone select and the Member select fit inside the window
- The page does not scroll sideways
