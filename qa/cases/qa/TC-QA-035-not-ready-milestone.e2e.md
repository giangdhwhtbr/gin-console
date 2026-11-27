# TC-QA-035: Not ready milestone

- **REQ:** REQ-QA-012@8e8bab41
- **Priority:** high

**Preconditions:**
- The readiness of `m2` of project `alpha` is "Not ready": `cases` and `gates` fail, `e2` waits on `implementation_complete`

**Steps:**
1. Open `/milestones/alpha/m2?tab=readiness`
2. Open the list of `Every epic shipped`

**Expected:**
- The tab reads "Not ready"
- Each item shows a fail mark that is not told by colour alone, its count and its note
- The list shows `e2` waiting on `implementation_complete` with a link to `/beads/alpha/e2`
