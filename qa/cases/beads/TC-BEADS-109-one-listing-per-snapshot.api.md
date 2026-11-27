# TC-BEADS-109: One listing per snapshot

- **REQ:** REQ-BEADS-031@400d25fb
- **Priority:** medium

**Preconditions:**
- Project `alpha` has beads `a-1` and `a-2`, each with a git-ref entry
- A fake git records every call
- `.beads/issues.jsonl` does not change during the case

**Steps:**
1. Send `GET /api/beads?project=alpha` twice
2. Send `GET /api/beads/alpha/a-1`
3. Send `GET /api/beads/alpha/a-2`

**Expected:**
- The fake git recorded one `git ls-tree -r --name-only` for `refs/gin/attachments` and one for `refs/gin-console/attachments`, and no more
