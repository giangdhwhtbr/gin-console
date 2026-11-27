# TC-QA-031: Run with screenshots

- **REQ:** REQ-QA-011@c5aa52d2
- **Priority:** high

**Preconditions:**
- Case `TC-UI-115` whose latest run has two steps, step 1 with a screenshot and step 2 failed with an error and none

**Steps:**
1. Open `/tests/alpha/TC-UI-115`
2. Activate the thumbnail of step 1

**Expected:**
- The page shows the id, title, capability, type, priority and effective result of the case, its requirements, and its bug
- "Latest run" shows the folder and both steps, step 2 with its error and no thumbnail
- The lightbox shows step 1's screenshot with the caption "1. <title>"
