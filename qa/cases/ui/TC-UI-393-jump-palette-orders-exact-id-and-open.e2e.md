# TC-UI-393: Jump palette orders exact id and open beads first

- **REQ:** REQ-UI-154@7989ca73
- **Priority:** medium

**Preconditions:**
- the signed-in email `ann@x.com` (localStorage `gin-console.email`)
- Projects `a` and `b`

**Test data:**
- `a-1` titled "Build" and `a-10` titled "a-1 follow-up", both open
- Closed `a-2` and open `a-3`, both with "cache" in the title

**Steps:**
1. Open `/beads?project=a` and press Ctrl+K
2. Type `a-1`
3. Clear the text and type `cache`

**Expected:**
- `a-1` is the first result, before `a-10`
- `a-3` is listed before `a-2`
