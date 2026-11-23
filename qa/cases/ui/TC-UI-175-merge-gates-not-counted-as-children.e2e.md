# TC-UI-175: Merge gates not counted as children

- **REQ:** REQ-UI-116@f93f8f82
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 6906b7b9

**Preconditions:**
- Epic `ex-e12` has 8 tracks and a merge gate whose parent is `ex-e12`

**Steps:**
1. Open the Graph view without a scope

**Expected:**
- The node of `ex-e12` shows the strand of 8 tracks and reads "n/8", never "n/9"
