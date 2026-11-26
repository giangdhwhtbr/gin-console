# TC-UI-284: Late milestone headline

- **REQ:** REQ-UI-095@3fd9927e
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** d6fa343c

**Preconditions:**
- The team report of an open milestone with 27 of 64 beads closed whose forecast `finish` is after its `end`
- The window is 900px wide, so the sidebar lists no report sections and the page shows its row of section links

**Steps:**
1. Open `/reports/status?project=alpha`

**Expected:**
- The Team headline reads "27 of 64 done, late" with a warning icon
