# TC-UI-400: Each group of My work

- **REQ:** REQ-UI-150@dca5fa0c
- **Priority:** high

**Preconditions:**
- the signed-in email `ann@x.com` (localStorage `gin-console.email`)
- Project `P` is the current project; `GET /api/beads?project=P` returns the beads of the test data

**Test data:**
- `t-1`: ready, assigned to `ann`
- `t-2`: ready, no assignee
- `t-3`: in progress, assigned to `ann`
- `t-4`: assigned to `ann`, blocked by open `t-5`
- `t-5`: open, assigned to `bob`
- `t-6`: open, assigned to `bob`, blocked by `t-3`

**Steps:**
1. Open `/my-tasks?project=P`

**Expected:**
- `t-1` is in "Assigned to me"
- `t-2` is in "Unclaimed"
- `t-3` is in "In progress"
- `t-4` is in "Blocked" and its row says "Blocked by" the title of `t-5`
- `t-6` is in "Waiting on me" and its row says "Waits on" the title of `t-3`
- `t-5` is in no group
- Each group heading shows the number of beads it holds
