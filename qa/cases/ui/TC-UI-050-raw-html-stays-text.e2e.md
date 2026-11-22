# TC-UI-050: Raw HTML stays text

- **REQ:** REQ-UI-028@a720e49e
- **Priority:** high

**Preconditions:**
- Bead `b-1` in project `alpha` has a description containing `<script>x</script>` and `<img src=x onerror=alert(1)>`

**Steps:**
1. Open `/beads/alpha/b-1`

**Expected:**
- Both strings appear as text
- No `script` or `img` element exists in the description
