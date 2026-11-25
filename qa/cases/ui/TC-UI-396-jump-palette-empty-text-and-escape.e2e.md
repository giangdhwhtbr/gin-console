# TC-UI-396: Jump palette empty text and Escape

- **REQ:** REQ-UI-154@7989ca73
- **Priority:** low

**Preconditions:**
- the signed-in email `ann@x.com` (localStorage `gin-console.email`)
- Projects `a` and `b`

**Steps:**
1. Open `/beads?project=a` and press Ctrl+K
2. Press Escape

**Expected:**
- The palette lists no beads and says "Type an id or a title"
- The dialog closes
