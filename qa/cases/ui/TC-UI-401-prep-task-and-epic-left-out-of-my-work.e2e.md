# TC-UI-401: Prep task and epic left out of My work

- **REQ:** REQ-UI-150@dca5fa0c
- **Priority:** medium

**Preconditions:**
- the signed-in email `ann@x.com` (localStorage `gin-console.email`)
- Project `P` is the current project

**Test data:**
- Prep bead: ready, label `prep`, no assignee
- Track bead: ready, labels `prep` and `track:2`, no assignee
- Epic: ready, no assignee

**Steps:**
1. Open `/my-tasks?project=P`

**Expected:**
- The prep bead (label `prep` only) is in no group
- The bead labelled `prep` and `track:2` is in "Unclaimed"
- The epic is in no group
