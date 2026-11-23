# TC-UI-180: Tracks left to right in a lane box

- **REQ:** REQ-UI-117@8f9669e9
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 4ce38b59

**Preconditions:**
- Epic `ex-e12` has lane be with tracks 1 and 2, and track 2 is blocked by track 1

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12`

**Expected:**
- The card of track 2 is right of the card of track 1 inside the be box
- An arrow runs from the card of track 1 to the card of track 2
