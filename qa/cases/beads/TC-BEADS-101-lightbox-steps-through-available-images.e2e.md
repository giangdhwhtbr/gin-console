# TC-BEADS-101: Lightbox steps through available images

- **REQ:** REQ-BEADS-030@9ca2034f
- **Priority:** high

**Preconditions:**
- Bug `a-1` of project `alpha` with available images 1 and 3 and a missing image 2

**Steps:**
1. Open `/beads/alpha/a-1`
2. Focus tile 1 of the Images panel and press Enter
3. Press →
4. Press → again
5. Press ←

**Expected:**
- After step 2 the lightbox shows image 1 with "1 of 2"
- After step 3 the lightbox shows image 3 with "2 of 2"
- After step 4 the lightbox still shows image 3 with "2 of 2"
- After step 5 the lightbox shows image 1 with "1 of 2"
