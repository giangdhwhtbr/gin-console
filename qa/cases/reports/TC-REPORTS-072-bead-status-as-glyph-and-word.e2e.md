# TC-REPORTS-072: Bead status as glyph and word

- **REQ:** REQ-REPORTS-016@274a4232
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-53-38
- **Checked:** 2d2ea974

**Preconditions:**
- The team report of milestone `m2` has open beads, some of them blocked

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/reports?project=alpha&tab=team&milestone=m2`
3. Select the Open list
4. Select the All list

**Expected:**
- After step 3, the Status column of each row shows the state glyph and its word
- After step 4, the Status column of each row shows the state glyph and its word
