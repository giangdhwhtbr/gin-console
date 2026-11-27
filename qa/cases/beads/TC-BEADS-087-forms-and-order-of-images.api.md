# TC-BEADS-087: Forms and order of images

- **REQ:** REQ-BEADS-026@8e331dd0
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-27T00-00-02-api
- **Checked:** f2d20cbb

**Preconditions:**
- Task `t-1` in project `p` whose description names `![Before](shots/a.png)`, then `see ~/brain/b.JPG`, then `https://example.com/c.png`, and whose notes name `shots/a.png` and `d.webp`

**Steps:**
1. Send `GET /api/beads/p/t-1`

**Expected:**
- `images` lists `shots/a.png` (caption "Before"), `~/brain/b.JPG` and `d.webp`, numbered 1 to 3
- The `https:` address is not listed and `shots/a.png` is listed once
