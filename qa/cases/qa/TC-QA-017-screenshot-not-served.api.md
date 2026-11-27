# TC-QA-017: Screenshot not served

- **REQ:** REQ-QA-006@30bc8f4c
- **Priority:** high

**Preconditions:**
- Step 2 of that run, whose screenshot is text, and a run with two steps

**Steps:**
1. Send the screenshot request for steps 2, 3 and 0 of `TC-UI-115`
2. Send the screenshot request for step 1 of `TC-UI-999`

**Expected:**
- Every response is 404 with the body `{"error":"not found"}`
