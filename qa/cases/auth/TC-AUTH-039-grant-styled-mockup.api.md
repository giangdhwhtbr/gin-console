# TC-AUTH-039: Grant styled mockup

- **REQ:** REQ-AUTH-016@d91a919b
- **Priority:** high

**Preconditions:**
- User `an` signed in, allowed project `a`; a confirmed mockup of `a` with `style.css`

**Steps:**
1. Request `style.css` through the grant path without a cookie

**Expected:**
- The file is served
