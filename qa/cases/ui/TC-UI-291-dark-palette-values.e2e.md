# TC-UI-291: Dark palette values

- **REQ:** REQ-UI-059@69731486
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 66288f8f

**Preconditions:**
- Project `P` reports at least one bead
- The dark theme is on (`prefers-color-scheme: dark`)

**Test data:**
- The same tokens as TC-UI-290

**Steps:**
1. Open `/beads?project=P&view=list`
2. Read the colour tokens of the document element

**Expected:**
- page is #12131A, paper #1B1C25, sunk #242632 and rule #2E303D
- graphite is #E8E9F0 and slate #A0A5B5
- amethyst is #B89EF6, jade #45CF9F, lapis #93B1FF, amber #F2A54C, hematite #9298A6 and carnelian #FF8A7A
