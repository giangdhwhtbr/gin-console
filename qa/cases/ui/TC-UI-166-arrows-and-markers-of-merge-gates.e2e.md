# TC-UI-166: Arrows and markers of merge gates

- **REQ:** REQ-UI-113@15c19511
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 00e5728f

**Preconditions:**
- Track 4 of lane `qa` in `ex-e12` is blocked by an open merge gate waiting for track 2 and a closed merge gate waiting for track 3

**Steps:**
1. Open `/beads?project=example&view=lanes&scope=ex-e12`

**Expected:**
- An arrow runs from track 2 to track 4 with the marker "Waiting"
- An arrow runs from track 3 to track 4 with the marker "Merged"
- No arrow segment or marker crosses a card or a header
