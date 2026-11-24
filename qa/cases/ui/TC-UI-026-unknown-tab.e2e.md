# TC-UI-026: Unknown tab

- **REQ:** REQ-UI-095@c0140122
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 710f7dcb

**Preconditions:**
- The URL `/reports/nope?project=alpha`
- The window is 900px wide, so the sidebar lists no report sections and the page shows its row of section links

**Test data:**
- None

**Steps:**
1. Open `/reports/nope?project=alpha`

**Expected:**
- The Page not found page of REQ-UI-125 is shown
