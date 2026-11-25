# TC-UI-390: My work cards on a phone

- **REQ:** REQ-UI-153@072411e0
- **Priority:** high

**Preconditions:**
- the signed-in email `ann@x.com` (localStorage `gin-console.email`)
- Window 390px wide; project `P`; ready task `t-1` titled "Set up CI", priority 2, assigned to `ann`

**Steps:**
1. Open `/my-tasks?project=P`

**Expected:**
- A card shows `t-1`, `P2`, the link "Set up CI" and "Ready"
- The page has no table
- The page has no horizontal scroll
