# TC-UI-120: Cut text has a tooltip

- **REQ:** REQ-UI-107@99b7498f
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 75f6d071

**Preconditions:**
- Project `alpha` has a milestone titled with 120 characters

**Steps:**
1. Open `/milestones?project=alpha`

**Expected:**
- The title in the list is cut short
- The full title is its `title`
