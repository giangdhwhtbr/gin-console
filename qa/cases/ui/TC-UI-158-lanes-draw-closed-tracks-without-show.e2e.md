# TC-UI-158: Lanes draw closed tracks without Show closed

- **REQ:** REQ-UI-111@c5095b0c
- **Priority:** medium

**Preconditions:**
- "Show closed" is off
- Track 1 of `ex-e12` is closed

**Steps:**
1. Open `/beads?project=example&view=lanes&scope=ex-e12`

**Expected:**
- The card of track 1 is drawn
