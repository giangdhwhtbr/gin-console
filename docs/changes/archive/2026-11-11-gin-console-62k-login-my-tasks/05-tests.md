# Tests: Login my tasks

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1: on the Tailscale deploy in a private window, the login screen shows at any URL; `giang` is refused; `Giangdhwhtbr@gmail.com` signs in and keeps the URL; a reload does not ask again; the sidebar shows `giangdhwhtbr@gmail.com`; "My Tasks" lists the beads assigned to `giangdhwhtbr` in gin-console and gin-workflow with their project, priority first; "Show closed" adds closed beads and `?closed=1`; "Log out" returns to the login screen; at phone width and desktop, light and dark | REQ-UI-097, REQ-UI-098, REQ-UI-099, REQ-UI-100, REQ-UI-101 | manual | pass, giangdhwhtbr, 2026-11-11 (Tailscale build of f71cb8e) |
