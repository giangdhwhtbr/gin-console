# TC-UI-398: Blocker named on My work

- **REQ:** REQ-UI-100@6b611f17
- **Priority:** high

**Preconditions:**
- the signed-in email `ann@x.com` (localStorage `gin-console.email`)
- Project `P` is the current project

**Test data:**
- `t-1`: assigned to `ann`, blocked by open `t-9` titled "Set up CI" and open `t-10`
- `t-9` and `t-10`: open, assigned to `bob`
- `t-4`: assigned to `bob`, blocked by `t-2` titled "Design tokens"
- `t-2`: in progress, assigned to `ann`

**Steps:**
1. Open `/my-tasks?project=P`

**Expected:**
- The row of `t-1` in "Blocked" shows "Blocked by Set up CI" and "+1"
- The row of `t-4` of `bob` in "Waiting on me" shows "Waits on Design tokens"
