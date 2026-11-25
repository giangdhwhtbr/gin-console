# TC-REQUIREMENTS-041: Redirect

- **REQ:** REQ-REQUIREMENTS-012@947360b0
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-25-28
- **Checked:** c099235f

**Preconditions:**
- The current project is `a`

**Steps:**
1. Open `/my-tasks?project=a`
2. Choose "Requirements" in the "Main" navigation
3. Go back in the browser history

**Expected:**
- After step 2 the URL is `/requirements/matrix?project=a`
- After step 3 the page is `/my-tasks?project=a`: the redirect left no history entry
