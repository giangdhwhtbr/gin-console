# TC-UI-169: Moving between rows with the keyboard

- **REQ:** REQ-UI-114@6ba1fa63
- **Priority:** medium

**Preconditions:**
- Lane `be` has track 2; lane `fe` is the row below with track 3 as its only card

**Steps:**
1. Open `/beads?project=example&view=lanes&scope=ex-e12`
2. Focus the card of track 2
3. Press Arrow Down

**Expected:**
- The focus and the selection move to track 3
- The details panel shows track 3
