# TC-REPORTS-051: Long options on a phone

- **REQ:** REQ-REPORTS-012@79484a74
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 6f2bdbbf

**Preconditions:**
- Project `alpha` has a milestone titled with 120 characters and a member `nguyen.thi.thanh.huong.payments-team@example-company.com.vn`
- The browser window is 390px wide

**Steps:**
1. Open `/reports/team?project=alpha`

**Expected:**
- The scope select and the Member select fit inside the window
- The page does not scroll sideways
