# TC-AUTH-039: Grant styled mockup

- **REQ:** REQ-AUTH-016@9b0a0c99
- **Priority:** high

**Preconditions:**
- User `an` signed in, allowed project `a`; a confirmed mockup `ui/2026-11-22` of `a` with `style.css`; `an` holds its grant from the mockup list

**Steps:**
1. Request `style.css` through the mockup's grant path without a cookie

**Expected:**
- The file is served
