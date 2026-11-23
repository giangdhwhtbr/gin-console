# TC-UI-377: No Show children on an epic page tab

- **REQ:** REQ-UI-149@544fbbd0
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 97daa047

**Preconditions:**
- The Graph tab of epic `ex-e12` at 1440px wide
- Track `ex-e12.3`, which has a child, is selected

**Steps:**
1. Read the panel

**Expected:**
- The panel offers "Open page"
- There is no `button "Show children"`
