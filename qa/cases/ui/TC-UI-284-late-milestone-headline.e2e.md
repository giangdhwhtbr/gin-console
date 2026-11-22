# TC-UI-284: Late milestone headline

- **REQ:** REQ-UI-095@c32236ad
- **Priority:** medium

**Preconditions:**
- The team report of an open milestone with 27 of 64 beads closed whose forecast `finish` is after its `end`
- The window is 900px wide, so the sidebar lists no report sections and the page shows its tab list

**Steps:**
1. Open `/reports?project=alpha`

**Expected:**
- The Team headline reads "27 of 64 done · late" with a warning icon
