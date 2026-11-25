# TC-UI-384: Overview with beads of two projects

- **REQ:** REQ-UI-073@9e85a65b
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-32-34
- **Checked:** d4a44a9f

**Preconditions:**
- Projects `a` and `b` are configured and the current project is `a`
- Bead `b-1` belongs to project `b`

**Steps:**
1. Open `/`
2. Click the link of `b-1` in a list

**Expected:**
- The first link of the breadcrumb reads "Overview" and goes to `/`
- Only the Overview link of the "Main" navigation has `aria-current="page"`
