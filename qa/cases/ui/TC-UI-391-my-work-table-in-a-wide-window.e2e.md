# TC-UI-391: My work table in a wide window

- **REQ:** REQ-UI-153@072411e0
- **Priority:** medium

**Preconditions:**
- the signed-in email `ann@x.com` (localStorage `gin-console.email`)
- Window 1024px wide; the same task `t-1` titled "Set up CI" assigned to `ann`

**Steps:**
1. Open `/my-tasks?project=P`

**Expected:**
- A table row shows `t-1`, "Set up CI" and "Ready"
- No card is shown
