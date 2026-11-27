# TC-AUTH-016: Open routes

- **REQ:** REQ-AUTH-005@f4dbe79b
- **Priority:** high

**Preconditions:**
- Auth is on

**Steps:**
1. Request `GET /api/health`, `GET /api/auth/me` and `POST /api/auth/logout` without a cookie

**Expected:**
- `/api/health` answers 200
- `/api/auth/me` answers 200
- `/api/auth/logout` answers 204
