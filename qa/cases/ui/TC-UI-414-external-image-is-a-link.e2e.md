# TC-UI-414: External image is a link

- **REQ:** REQ-UI-028@5c612d02
- **Priority:** high

**Preconditions:**
- Bead `b-1` of project `alpha` whose description holds `![chart](https://example.com/x.png)` and `![key](attachment:ab12)`

**Steps:**
1. Open `/beads/alpha/b-1`

**Expected:**
- "Image: chart (example.com)" is a link to `https://example.com/x.png` that opens in a new tab
- "key" is text
- No `img` element is in the description
- No request goes to example.com
