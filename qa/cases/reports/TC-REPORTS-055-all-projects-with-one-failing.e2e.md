# TC-REPORTS-055: Milestones request fails

- **REQ:** REQ-REPORTS-018@70b62d05
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** b7e6242c

**Preconditions:**
- Project `alpha` whose `GET /api/milestones?project=alpha` answers 502 with `cause: "outdated"`

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/reports/velocity?project=alpha`

**Expected:**
- The section shows the outdated error
- No figures are shown
