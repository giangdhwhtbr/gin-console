# TC-BEADS-117: Failed fetch note on Beads

- **REQ:** REQ-BEADS-034@7fd35041
- **Priority:** high

**Preconditions:**
- Projects `alpha` and `omega` are configured
- `GET /api/projects/beads` gives `alpha` an `attachments_fetch` with `status` `error` and `error` "no network", and `omega` one with `status` `no_store`

**Steps:**
1. Open `/beads?project=alpha`
2. Open `/beads?project=omega`

**Expected:**
- After step 1 one note reads "Fetching attachments of alpha failed: no network. Run `git fetch origin +refs/gin/attachments:refs/gin-console/attachments` in" followed by alpha's path, above the list
- After step 2 no note about attachments is shown
