# TC-UI-167: Arrow inside a lane

- **REQ:** REQ-UI-113@15c19511
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** dd7a9ecc

**Preconditions:**
- Track 2 of lane `be` is blocked by track 1

**Steps:**
1. Open `/beads?project=example&view=lanes&scope=ex-e12`

**Expected:**
- An arrow runs from track 1 to track 2
- The arrow has no marker
