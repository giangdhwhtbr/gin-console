# TC-QA-050: Change the window

- **REQ:** REQ-QA-018@bdddd329
- **Priority:** medium

**Preconditions:**
- The Trends tab of `alpha`

**Steps:**
1. Open `/tests?project=alpha&tab=trends`
2. Pick 7 days
3. Pick the capability `ui`

**Expected:**
- The URL holds `tab=trends&days=7&capability=ui`
- The tab requests `days=7&capability=ui`
