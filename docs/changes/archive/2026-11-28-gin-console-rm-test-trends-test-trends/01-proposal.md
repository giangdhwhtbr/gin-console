# Test trends

Epic: gin-console-rm-test-trends
Kind: capability
Points: 3 (6 new REQs: one endpoint over a new gin-qa command with a cache, pure aggregation, a Trends tab with one chart and three lists; smaller than gin-console-rm-test-coverage = 8, same as the roadmap)
Date: 2026-11-28

## Why

The Tests page shows only the latest result of each case. QA and developers cannot see whether the pass rate is getting better or worse, which cases flip between passed and failed without being changed, or how long a failure stays open before a run passes again. gin-qa now records every manual, e2e and automated result as an append-only run record and reads them back with `gin-qa runs export --format json` (gin-workflow epic gin-workflow-g2gx, capability `qa-run-history`, shipped 2026-11-22).

Goal and scope after the epic's comments: pass rate over runs, flaky cases and time from failure to fix, read from `gin-qa runs export --format json`; a pass-rate trend per capability; flaky cases; the median time from a failed run to the next pass. Out of scope: running tests. Test coverage and release readiness shipped (merge `32c6351`): the console already has the `qa` context (a `gin-qa` runner injected into `create_app`, a 60 second cache, the `missing` and `outdated` causes) and the Tests page at `/tests`; trends build on them as a Trends tab of that page instead of a new page.

Comments considered: 1, latest 2026-11-27T16:34:05Z

Facts measured on 2026-11-28 in gin-console:
- `gin-qa runs export --format json` prints `{"runs": [...], "problems": [...]}`; `runs` is sorted by `at`, then file and line; each record has `actor`, `at` (UTC, `YYYY-MM-DDTHH:MM:SSZ`), `bug` (`""` when none), `capability`, `case`, `evidence`, `hash8`, `result` (`passed`, `failed`, `blocked` or `not run`) and `run`. Filters: `--capability`, `--case`, `--since YYYY-MM-DD`. Keys are only ever added (gin-workflow `docs/reference/cli.md`, `gin-qa runs export`).
- 2082 records from 2026-11-22 to 2026-11-27, 639 cases, about 700 KB: passed 2065, failed 17, none blocked or not run; actors `claude` 1768 and a person 314. Many records of one e2e run share the same `at`.
- A record keeps the case id it ran under; `gin-qa cases renumber` does not rewrite records.

User decisions 2026-11-28:
- **Place:** a Trends tab on the Tests page, next to a Cases tab that holds today's content; `?tab=trends`.
- **Flaky:** a case is flaky when it has both a passed and a failed result with the same `hash8` (the case text did not change) in the window, ranked by the number of flips; a flip across a change of `hash8` does not count.
- **Chart and window:** pass rate per local day, one line per capability, with a capability filter; a window of 7, 30 or 90 days, 30 by default, which also scopes the flaky and time-to-fix sections.
- **Time to fix:** the median, overall and per capability, of the time from the first failure of a streak to the next passed run, over the streaks that passed again in the window; plus the list of cases still failing, how long, and their bug.
- **Architecture:** the server reads the export and works out the trends in one endpoint (approach A); the browser only draws them.

Assumptions (defaults taken without a question):
- `blocked` and `not run` are left out of the pass rate, the flips and the streaks.
- Every actor counts, agents and people alike.
- A failure that started before the window and passed inside it is not counted, since the window starts the read.
- A real bug fixed in the code (same `hash8`, failed then passed) shows as flaky and as a fix; the user accepted this overlap.
- A case id that was renumbered since still links to the case page, which shows its not-found state.
- The days of the window are local days of the browser's time zone, sent as an IANA name.

## What Changes

- **Backend (`qa` context):** `GET /api/qa/trends/{project}?days=&tz=&capability=` over `gin-qa runs export --format json --since <date>`, with a 60 second cache per project and start date; pure functions for the daily pass rate, flaky cases, time to fix and cases still failing.
- **Tests page:** a Cases | Trends tab bar; the Trends tab with the window and capability filters, the pass-rate chart, the flaky cases, the time to fix and the cases still failing.

## User Stories

### US-1: Pass-rate trend
As a QA, I want the pass rate of each capability per day over the last weeks, so that I see whether test results get better or worse.
REQ: REQ-QA-014, REQ-QA-015, REQ-QA-018, REQ-QA-019

Acceptance criteria:
- The Tests page has a Trends tab that shows a line per capability of passed / (passed + failed) per local day, for the last 30 days by default.
- The window can be set to 7, 30 or 90 days and the chart to one capability, and both stay in the URL.
- A day without passed or failed runs leaves a gap, not a zero.
- A project without run history, an old gin-qa or a failed read says why on the Trends tab, and the Cases tab still works.

### US-2: Flaky cases
As a developer, I want the cases that flip between passed and failed without being changed, so that I fix the unstable tests first.
REQ: REQ-QA-016, REQ-QA-018

Acceptance criteria:
- The Trends tab lists each case with a passed and a failed result of the same `hash8` in the window, with its capability, number of flips, last result and when, most flips first.
- A case that failed, was changed and then passed is not listed.
- Each case links to its case page.

### US-3: Time to fix
As a lead, I want how long failures stay open and which cases still fail, so that I see how fast the team recovers.
REQ: REQ-QA-017, REQ-QA-018

Acceptance criteria:
- The Trends tab shows the median time from the first failure of a streak to the next pass, overall and per capability, with the number of fixes counted.
- It lists the cases whose last result in the window is failed, with how long they have failed and a link to their bug.
- With no fix in the window the median reads "No fix yet" instead of a number.

## Capabilities Affected

| Capability | REQs | Assets / Diagrams / Use Cases |
|---|---|---|
| `qa` | `REQ-QA-014` to `REQ-QA-019` | `docs/specs/qa/diagrams/trends-activity.md`, `docs/specs/qa/use-cases/review-test-trends.md` |

## Non-goals

- Running tests or recording results from the console.
- Reading `qa/runs` files directly.
- Per-actor or per-run breakdowns, alerts, or windows other than 7, 30 and 90 days.
- Joining run records to the current cases to follow a renumbered case id.

## Success Criteria

- On this host, the Trends tab of gin-console for 30 days shows a line per capability from 2026-11-22, lists the cases with a flip under one `hash8`, and its counts match a script over `gin-qa runs export --format json`.
- `pytest`, `ruff`, `mypy`, `vitest`, `typecheck`, `lint` and `build` pass with each REQ named in a test, and `gin-qa cases check --change gin-console-rm-test-trends` prints `ok`.
