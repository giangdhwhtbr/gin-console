# TC-SERVER-022: Mockup files

- **REQ:** REQ-SERVER-012@bada5444
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-26T14-14-56-api
- **Checked:** 4f54760b

**Preconditions:**
- The server is running with a confirmed mockup folder that holds `style.css`

**Steps:**
1. Request `GET` of that `style.css` under `/api/requirements/mockups/<project>/files/` with `Sec-Fetch-Site: cross-site`
2. Request `POST` of the same path with `Sec-Fetch-Site: cross-site`

**Expected:**
- The GET answers 200 with the file
- The POST answers 403
