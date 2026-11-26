# TC-UI-247: Change section

- **REQ:** REQ-UI-129@89b58eb2
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 911f5705

**Preconditions:**
- Project `a` is configured with a report
- The window is 1440px wide and the sidebar is expanded

**Steps:**
1. Open `/reports/delivery?project=a&days=7`
2. Click "Rework" in the sidebar

**Expected:**
- The URL becomes `/reports/rework?project=a&days=7`
- The Rework panel is shown
