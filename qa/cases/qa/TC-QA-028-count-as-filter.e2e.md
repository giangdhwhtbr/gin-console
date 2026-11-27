# TC-QA-028: Count as filter

- **REQ:** REQ-QA-010@c04a7b48
- **Priority:** high

**Preconditions:**
- The Tests page of `alpha` of the case "Counts and list"

**Steps:**
1. Open `/tests?project=alpha`
2. Activate the `outdated` count of `ui` in the capability table

**Expected:**
- The URL holds `capability=ui&result=outdated`
- The list shows `TC-UI-001` only
