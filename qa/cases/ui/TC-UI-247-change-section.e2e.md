# TC-UI-247: Change section

- **REQ:** REQ-UI-129@de1adeec
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 911f5705

**Preconditions:**
- Project `a` is configured with a report
- The window is 1440px wide and the sidebar is expanded

**Steps:**
1. Open `/reports?project=a&days=7&tab=delivery`
2. Click "Quality" in the sidebar

**Expected:**
- The URL becomes `/reports?project=a&days=7&tab=quality`
- The Quality panel is shown
