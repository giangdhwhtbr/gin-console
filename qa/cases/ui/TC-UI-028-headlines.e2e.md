# TC-UI-028: Headlines

- **REQ:** REQ-UI-095@c0140122
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** b01a5dd0

**Preconditions:**
- A report with 41 closed beads and rework rate 0.09, and a status report whose verdict is "At risk"
- The window is 900px wide, so the sidebar lists no report sections and the page shows its row of section links

**Test data:**
- None

**Steps:**
1. Open `/reports/status?project=alpha&milestone=m2`

**Expected:**
- The headlines read "At risk" with a warning icon, "41 beads closed" and "9% rework", and no section is named Quality, AI usage or Data coverage
