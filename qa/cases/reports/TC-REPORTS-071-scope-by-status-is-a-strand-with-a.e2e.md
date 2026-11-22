# TC-REPORTS-071: Scope by status is a strand with a legend

- **REQ:** REQ-REPORTS-013@5683bbdb
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 7b250bfc

**Preconditions:**
- The team report of milestone `m2` has scope 64, of which 27 closed, with beads in progress, blocked, ready and deferred

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/reports?project=alpha&tab=team&milestone=m2`
3. Look at "Scope by status" under the figures

**Expected:**
- The Done figure reads "27 of 64"
- "Scope by status" is drawn as a strand, Ready being Open without blocked
- A legend gives the glyph, the word and the count of each state
