# TC-UI-191: No lane inside a lane box

- **REQ:** REQ-UI-115@ed5e8117
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** d764efed

**Preconditions:**
- Epic `ex-e12` has lane be with tracks 1 and 2, and track 2 is `ex-e12.2`

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12`

**Expected:**
- The card of track 2 sits in the box headed "be"
- The card of track 2 shows no lane (no dot and no title "Lane be")
