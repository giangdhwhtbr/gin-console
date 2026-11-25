# TC-UI-383: Breadcrumb from Overview

- **REQ:** REQ-UI-072@f6caddae
- **Priority:** high

**Preconditions:**
- Projects `a` and `b` are configured and the current project is `a`
- Bead `a-1` is titled "Fix login"

**Steps:**
1. Open `/`
2. Click the link of `a-1` in a list

**Expected:**
- The breadcrumb reads "Overview" then "Fix login"
- "Overview" goes to `/`
