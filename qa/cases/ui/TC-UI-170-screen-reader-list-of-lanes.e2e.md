# TC-UI-170: Screen reader list of lanes

- **REQ:** REQ-UI-114@6ba1fa63
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** dbad68ea

**Preconditions:**
- Lane `be` is running, held by `ann`, with a lease and 1/2 tracks closed
- Track 4 of lane `qa` waits for track 2 of lane `be` through an open merge gate

**Steps:**
1. Open `/beads?project=example&view=lanes&scope=ex-e12`

**Expected:**
- The list for screen readers holds "be: Running, held by ann, lease until …, 1/2 closed"
- The list holds "qa #4 waits for be #2: merge pending"
