# Tests: Quality signals

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | case | evidence |
|---|---|---|---|---|
| TC-1 | REQ-UI-086, REQ-BEADS-011 | manual | On gin-workflow, `gin-workflow-wd1t` (reopened once per `bd history`) shows "Reopened 1 time"; a bead never reopened shows nothing; `gin-console-djg` shows no "Bugs found"; laptop and phone, light and dark | 2026-11-01, build `0f90249` served on `:8701` (phone via tailnet `:8444`): passed on laptop and phone, light and dark. `gin-workflow-wd1t` shows "Reopened 1 time" (second load instant from cache); `gin-console-l69` shows no reopen text; `gin-console-djg` has no "Bugs found". Checked by giangdhwhtbr. |
| TC-2 | REQ-UI-087 | manual | On `gin-workflow-wd1t`, "Reopened 1 time" is in the bug color and readable; on a bead with bugs found, the "Bugs found" heading is in the bug color and its rows are not; laptop and phone, light and dark | 2026-11-01, build `dbe921d` (bundle `index-BLX8mQ3i.js`) served on `:8701` (phone via tailnet `:8444`): passed on laptop and phone, light and dark. "Reopened 1 time" on `gin-workflow-wd1t` and the "Bugs found" heading on `gin-workflow-btt3` show in the bug color with the separator and bug rows in the default color. Checked by giangdhwhtbr. |
