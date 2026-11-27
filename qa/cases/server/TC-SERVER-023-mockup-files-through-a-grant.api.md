# TC-SERVER-023: Mockup files through a grant

- **REQ:** REQ-SERVER-012@bada5444
- **Priority:** high

**Preconditions:**
- Auth is on and a user is signed in
- A confirmed mockup of the user's project with `style.css`

**Steps:**
1. Request `GET <grant path>/style.css` with `Sec-Fetch-Site: cross-site` and no cookie
2. Request `POST` to the same path with `Sec-Fetch-Site: cross-site`

**Expected:**
- The GET is not refused by the cross-site check and the file is served by the grant check
- The POST is refused with 403 `cross-site request refused`
