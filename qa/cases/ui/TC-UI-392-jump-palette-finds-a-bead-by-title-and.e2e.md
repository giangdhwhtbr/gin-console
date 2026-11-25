# TC-UI-392: Jump palette finds a bead by title and opens it

- **REQ:** REQ-UI-154@7989ca73
- **Priority:** high

**Preconditions:**
- the signed-in email `ann@x.com` (localStorage `gin-console.email`)
- Projects `a` and `b`; bead `b-7` titled "Fix login redirect" in `b`

**Steps:**
1. Open `/beads?project=a`
2. Press Ctrl+K
3. Type `login`
4. Press Enter with `b-7` selected

**Expected:**
- The palette opens and lists `b-7` "Fix login redirect" with its project `b` after step 3
- The page of `b-7` at `/beads/b/b-7` opens
- The dialog closes
