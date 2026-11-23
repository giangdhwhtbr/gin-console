# TC-UI-367: Click and double click on an epic page tab

- **REQ:** REQ-UI-147@a7576fab
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 0d958efd

**Preconditions:**
- The Lanes tab of epic `ex-e12` at 1440px wide with card `ex-e12.2`

**Steps:**
1. Click the card of `ex-e12.2`
2. Double-click the card of `ex-e12.2`

**Expected:**
- The click puts `select=ex-e12.2` in the URL and shows its panel
- The double click opens the bead page of `ex-e12.2`
