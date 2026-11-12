# Tests: Beads transfer

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-BEADS-014, REQ-SERVER-011 | manual | On the Tailscale deploy, the Beads page of `qwikfone` with "Show closed" on: the first `/api/beads` answer has `Content-Encoding: gzip`, and later reloads answer 304 while no bead changes (browser DevTools, Network); pass, giangdhwhtbr, 2026-11-12 (Tailscale build of 6d5d7fb) |
