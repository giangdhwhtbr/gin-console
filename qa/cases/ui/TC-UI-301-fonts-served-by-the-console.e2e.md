# TC-UI-301: Fonts served by the console

- **REQ:** REQ-UI-136@8a7acd01
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 27da1333

**Preconditions:**
- Project `P` reports at least one bead
- Every request to a host other than the console (`127.0.0.1:8701`) is aborted

**Steps:**
1. Open `/beads?project=P&view=list`
2. Wait for the fonts to load (`document.fonts.ready`)
3. Check that the font Recursive is loaded (`document.fonts.check("14px Recursive")`)

**Expected:**
- The Recursive font file is answered by the console itself
- The text is drawn in Recursive
