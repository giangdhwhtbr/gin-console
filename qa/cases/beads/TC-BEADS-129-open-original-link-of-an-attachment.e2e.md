# TC-BEADS-129: Open original link of an attachment

- **REQ:** REQ-BEADS-030@14c96b76
- **Priority:** medium

**Preconditions:**
- Bug `a-1` of project `alpha` with image 2, the attachment `A` served as an attachment

**Steps:**
1. Open `/beads/alpha/a-1`
2. Focus tile 2 of the Images panel and press Enter

**Expected:**
- The lightbox shows the link "Open original" to `/api/beads/alpha/a-1/attachments/A`
