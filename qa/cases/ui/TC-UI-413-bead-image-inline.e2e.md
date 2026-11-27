# TC-UI-413: Bead image inline

- **REQ:** REQ-UI-028@b6db5034
- **Priority:** high

**Preconditions:**
- Bug `a-1` of project `alpha` whose description holds `![Step 1](qa/evidence/r1/01.png)` and whose image 1 is that file, available

**Steps:**
1. Open `/beads/alpha/a-1`
2. Click the image in the description

**Expected:**
- After step 1 the description shows an image from `/api/beads/alpha/a-1/images/1` with `alt` "Step 1"
- After step 2 the lightbox opens on it
