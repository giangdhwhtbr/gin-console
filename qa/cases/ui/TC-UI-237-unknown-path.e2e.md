# TC-UI-237: Unknown path

- **REQ:** REQ-UI-125@dacca938
- **Priority:** high

**Preconditions:**
- Projects `a` and `b` are configured and the current project is `a`

**Steps:**
1. Open `/beads?project=a`
2. Open `/nope`

**Expected:**
- The page shows the heading "Page not found" and the path `/nope`
- A link goes to `/` and a link goes to `/beads?project=a`
- The document title is `Page not found · gin-console`
