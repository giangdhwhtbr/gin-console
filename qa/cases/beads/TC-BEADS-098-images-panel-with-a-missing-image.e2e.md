# TC-BEADS-098: Images panel with a missing image

- **REQ:** REQ-BEADS-029@8dd84d5b
- **Priority:** high

**Preconditions:**
- Bug `a-1` of project `alpha` with image 1 available (caption `01.png`) and image 2 not available (path `/tmp/x.png`)

**Steps:**
1. Open `/beads/alpha/a-1`

**Expected:**
- The panel "Images (2)" is shown under the description
- Tile 1 shows the image with `alt` `01.png`
- Tile 2 reads "Not on this host" and `/tmp/x.png`
