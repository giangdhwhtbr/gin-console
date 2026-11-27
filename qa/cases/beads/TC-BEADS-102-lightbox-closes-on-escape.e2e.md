# TC-BEADS-102: Lightbox closes on Escape

- **REQ:** REQ-BEADS-030@9ca2034f
- **Priority:** high

**Preconditions:**
- Bug `a-1` of project `alpha` with available image 1

**Steps:**
1. Open `/beads/alpha/a-1`
2. Focus tile 1 of the Images panel and press Enter
3. Press Escape

**Expected:**
- After step 2 the lightbox is open
- After step 3 the lightbox is closed and tile 1 has the focus
