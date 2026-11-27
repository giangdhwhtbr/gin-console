# TC-UI-420: Attachment image inline

- **REQ:** REQ-UI-028@b6db5034
- **Priority:** high

**Preconditions:**
- Bug `a-1` of project `alpha` whose description holds `![Step 1](attachment:A)` followed by `  local: qa/evidence/r1/01.png`, whose image 1 is that pair, available and served as an attachment
- Bug `a-2` of `alpha` with the same description whose attachment is not fetched and whose file is available

**Steps:**
1. Open `/beads/alpha/a-1`
2. Open `/beads/alpha/a-2`

**Expected:**
- After step 1 the description shows one image from `/api/beads/alpha/a-1/attachments/A` with `alt` "Step 1" and the `local:` line as text
- After step 2 the description shows one image from `/api/beads/alpha/a-2/images/1` with `alt` "Step 1" and the `local:` line as text
