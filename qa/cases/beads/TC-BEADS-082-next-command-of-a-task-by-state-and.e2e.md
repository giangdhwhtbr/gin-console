# TC-BEADS-082: Next command of a task by state and assignee

- **REQ:** REQ-BEADS-025@3250396f
- **Priority:** high

**Preconditions:**
- the signed-in email `ann@x.com` (localStorage `gin-console.email`)
- Project `P` with the tasks of the test data; `GET /api/beads/P/<id>` returns each one

**Test data:**
- `t-1`: ready, no assignee
- `t-2`: ready, assigned to `ann`
- `t-3`: in progress, assigned to `ANN@other.com`
- `t-4`: in progress, assigned to `bob`
- `t-5`: ready, assigned to `bob`
- `t-6`: status `in_progress`, assigned to `ann`, blocked by an open bead

**Steps:**
1. Open `/beads/P/t-1`
2. Open `/beads/P/t-2`
3. Open `/beads/P/t-3`
4. Open `/beads/P/t-4`
5. Open `/beads/P/t-5`
6. Open `/beads/P/t-6`

**Expected:**
- The header of `t-1` shows the next command `gin task update t-1 --claim`
- The header of `t-2` shows `gin task update t-2 --claim`
- The header of `t-3` shows `/gin:execute t-3`
- The header of `t-4` shows no next command
- The header of `t-5` shows no next command
- The header of `t-6` shows no next command
