# TC-BEADS-119: Older backend shows no fetch note

- **REQ:** REQ-BEADS-034@7fd35041
- **Priority:** medium

**Preconditions:**
- Projects `alpha` has no `attachments_fetch` key, as an older backend answers

**Steps:**
1. Open `/beads?project=alpha`
2. Open `/my-tasks`

**Expected:**
- No note about attachments is shown on either page
