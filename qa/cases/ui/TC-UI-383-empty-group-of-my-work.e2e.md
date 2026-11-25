# TC-UI-383: Empty group of My work

- **REQ:** REQ-UI-150@dca5fa0c
- **Priority:** low

**Preconditions:**
- the signed-in email `ann@x.com` (localStorage `gin-console.email`)
- Project `P` has one ready bead assigned to `ann` and no other bead of hers

**Steps:**
1. Open `/my-tasks?project=P`

**Expected:**
- "Assigned to me" lists the bead
- "In progress" says "Nothing here"
