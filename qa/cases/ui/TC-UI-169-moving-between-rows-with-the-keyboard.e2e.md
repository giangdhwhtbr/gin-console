# TC-UI-169: Moving between rows with the keyboard

- **REQ:** REQ-UI-114@6ba1fa63
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** de8e8983

**Preconditions:**
- Lane `be` has track 2; lane `fe` is the row below with track 3 as its only card

**Steps:**
1. Open `/beads?project=example&view=lanes&scope=ex-e12`
2. Focus the card of track 2
3. Press Arrow Down

**Expected:**
- The focus and the selection move to track 3
- The details panel shows track 3
