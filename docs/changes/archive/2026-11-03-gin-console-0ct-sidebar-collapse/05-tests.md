# Tests: Sidebar collapse

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-UI-094, REQ-UI-056 | manual | At 1280px on a page taller than the window: the theme and collapse icons are on the brand row, visible without scrolling, and "gin-console" stays on one line; collapse, then expand; the rail matches the 820px rail with both icons under the brand mark, and the sidebar returns to 224px, in light and dark | pass (owner, 2026-11-03, Tailscale build e78c1e6) |
| TC-2 | REQ-UI-094 | manual | Collapse, reload; the sidebar stays collapsed | pass (owner, 2026-11-03, Tailscale build e78c1e6) |
| TC-3 | REQ-UI-094, REQ-UI-056 | manual | At 820px no collapse button is shown and the theme icon is under the brand mark; at 390px the top bar and tab bar are unchanged | pass (owner, 2026-11-03, Tailscale build e78c1e6) |
