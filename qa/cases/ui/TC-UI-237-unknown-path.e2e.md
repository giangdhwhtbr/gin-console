# TC-UI-237: Unknown path

- **REQ:** REQ-UI-125@504d809e
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** c782d564

**Preconditions:**
- Projects `a` and `b` are configured and the current project is `a`

**Steps:**
1. Open `/beads?project=a`
2. Open `/nope`

**Expected:**
- The page shows the heading "Page not found" and the path `/nope`
- A link goes to `/beads?project=a` and a link goes to `/my-tasks?project=a`
- The document title is `Page not found · gin-console`
