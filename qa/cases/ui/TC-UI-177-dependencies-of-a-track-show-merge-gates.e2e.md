# TC-UI-177: Dependencies of a track show merge gates

- **REQ:** REQ-UI-116@f93f8f82
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** f3f1c6b4

**Preconditions:**
- Track 4 is blocked by an open merge gate waiting for track 2 of lane `be` and a closed merge gate waiting for track 3 of lane `fe`

**Steps:**
1. Open the bead page of track 4

**Expected:**
- The Dependencies read "Waits for be #2, merge pending"
- The Dependencies read "Waits for fe #3, merged"
