# TC-UI-395: Jump palette caches until Refresh

- **REQ:** REQ-UI-154@7989ca73
- **Priority:** medium

**Preconditions:**
- the signed-in email `ann@x.com` (localStorage `gin-console.email`)
- Projects `a` and `b`

**Steps:**
1. Open `/beads?project=a`, press Ctrl+K and press Escape
2. Press Ctrl+K again
3. Click "Refresh data"
4. Press Ctrl+K once more

**Expected:**
- The first opening requests the beads of every project
- The second opening sends no beads request
- The third opening sends the beads requests again
