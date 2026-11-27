# TC-UI-415: Link to a bead image

- **REQ:** REQ-UI-028@b6db5034
- **Priority:** medium

**Preconditions:**
- Bug `a-1` of project `alpha` whose description holds `[BUG-5.png](file:///srv/att/BUG-5.png)` and whose image 1 is that file, available, and `[shot](attachment:A)` whose image 2 is that attachment, available

**Steps:**
1. Open `/beads/alpha/a-1`
2. Activate "BUG-5.png"
3. Press Escape
4. Activate "shot"

**Expected:**
- After step 2 the lightbox opens on image 1
- After step 4 the lightbox opens on image 2
