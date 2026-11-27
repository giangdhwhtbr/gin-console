# TC-BEADS-103: Open original link

- **REQ:** REQ-BEADS-030@14c96b76
- **Priority:** medium

**Preconditions:**
- Bug `a-1` of project `alpha` with available image 1

**Steps:**
1. Open `/beads/alpha/a-1`
2. Focus tile 1 of the Images panel and press Enter

**Expected:**
- The lightbox shows the link "Open original" to `/api/beads/alpha/a-1/images/1` with `target="_blank"` and `rel="noreferrer"`
