# TC-UI-248: Narrow window

- **REQ:** REQ-UI-129@89b58eb2
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** e12f82c5

**Preconditions:**
- Project `a` is configured with a report
- The window is 900px wide

**Steps:**
1. Open `/reports/delivery?project=a`

**Expected:**
- The sidebar lists no report sections
- The page shows its row of section links
