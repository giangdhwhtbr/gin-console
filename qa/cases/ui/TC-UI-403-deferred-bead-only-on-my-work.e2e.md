# TC-UI-403: Deferred bead only on My work

- **REQ:** REQ-UI-150@dca5fa0c
- **Priority:** medium

**Preconditions:**
- the signed-in email `ann@x.com` (localStorage `gin-console.email`)
- Project `P` is the current project; the only bead assigned to `ann` is deferred

**Steps:**
1. Open `/my-tasks?project=P`

**Expected:**
- No group lists the bead
- The page says "No work for ann@x.com" and offers a link "Open the Beads page"
