# Tests: Canvas scroll

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-UI-122, REQ-UI-077, REQ-UI-106, REQ-UI-117, REQ-UI-110 | QE | On the deployed console: the Graph of `ex-e12` opens with no details panel and the lane boxes in tiers from left to right (be, fe, infra, then qa and No lane), matching `assets/c-light.png`; with the pointer over the Lanes view of `ex-e12` and over the Graph view of `ex-e12` (Show closed on) at 1440×900 and 1920×1080, a wheel turn scrolls the page and no canvas shows a vertical scroll bar; Ctrl+wheel still zooms the Graph; `qa/e2e/readability-live.js --project example` reports no finding; screenshots looked at |
