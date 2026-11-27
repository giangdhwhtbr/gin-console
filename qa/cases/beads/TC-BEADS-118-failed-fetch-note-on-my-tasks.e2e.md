# TC-BEADS-118: Failed fetch note on My Tasks

- **REQ:** REQ-BEADS-034@7fd35041
- **Priority:** medium

**Preconditions:**
- Projects `alpha` and `omega` are configured
- `alpha` has `attachments_fetch.status` `error` with `error` "no network", and `omega` has `status` `ok`
- The current project is `alpha`

**Steps:**
1. Open `/my-tasks`

**Expected:**
- One note about the failed fetch of `alpha` is shown above the list, with its error and its path
- No note about `omega` is shown
