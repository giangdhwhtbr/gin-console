# TC-BEADS-127: Images panel with attachments

- **REQ:** REQ-BEADS-029@8dd84d5b
- **Priority:** high

**Preconditions:**
- Bug `a-1` of project `alpha` with image 1 the available attachment `A`, image 2 a pruned attachment, image 3 an attachment not fetched with path `qa/evidence/r1/03.png`, and image 4 an attachment of the `s3` store

**Steps:**
1. Open `/beads/alpha/a-1`

**Expected:**
- The panel "Images (4)" is shown
- Tile 1 shows the image from `/api/beads/alpha/a-1/attachments/A`
- Tile 2 reads "Pruned"
- Tile 3 reads "Not fetched yet" and `qa/evidence/r1/03.png`
- Tile 4 reads "Stored where this host cannot read it"
