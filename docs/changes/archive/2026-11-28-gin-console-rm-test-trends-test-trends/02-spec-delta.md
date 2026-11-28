# Spec Delta: Test trends

A run is one record of `gin-qa runs export --format json`. Runs are taken in the order of the export (`at`, then file and line), which orders runs that share an `at`. Only `passed` and `failed` runs count in REQ-QA-015 to REQ-QA-017; `blocked`, `not run` and any other result are left out.

## ADDED

### REQ-QA-014: Trends request
WHEN a client requests `GET /api/qa/trends/{project}?days=<n>&tz=<zone>&capability=<cap>`, the server SHALL take `days` in 7, 30 or 90 (default 30), `tz` as an IANA time zone (default `UTC`) and an optional `capability`; the window SHALL be the `days` local days in `tz` that end today, starting at 00:00 of the first. The server SHALL run `gin-qa runs export --format json --since <UTC date of the window start>` in the project's directory, keep the runs whose `at` falls in the window and, with `capability`, only that capability's, and SHALL return `days` (the local dates of the window, oldest first), `tz`, the sections of REQ-QA-015 to REQ-QA-017 and `problems` (the export's `problems`). The server SHALL respond 422 for another `days` or an unknown `tz`, 404 as REQ-QA-002 says, and 502 with `error` and `cause` as REQ-QA-002 says, the cause `outdated` when the output has no `runs` list or gin-qa has no `runs` command. It SHALL keep the export for 60 seconds per project and start date, run at most one per project and date at a time, not keep a failure, and forget it on `POST /api/refresh`.

#### Scenario: Window in the browser's zone
- GIVEN today is 2026-11-28 in `Asia/Ho_Chi_Minh` and project `alpha` has runs at `2026-11-21T16:59:59Z` and `2026-11-21T17:00:00Z`
- WHEN a client requests `/api/qa/trends/alpha?days=7&tz=Asia/Ho_Chi_Minh`
- THEN gin-qa ran with `--since 2026-11-21`, `days` lists 2026-11-22 to 2026-11-28, and only the run at `17:00:00Z` counts

#### Scenario: Bad window
- GIVEN project `alpha`
- WHEN a client requests `days=14` or `tz=Mars/Base`
- THEN the response is 422 and gin-qa did not run

#### Scenario: Old gin-qa
- GIVEN a gin-qa that answers `invalid choice: 'runs'`
- WHEN the trends of `alpha` are requested
- THEN the response is 502 with the cause `outdated`

#### Scenario: Problems kept
- GIVEN an export with two runs and the problem `qa/runs/2026-11/bao.jsonl:4: not JSON`
- WHEN the trends are requested
- THEN the response is 200, counts the two runs and lists the problem

#### Scenario: Cache
- GIVEN the trends of `alpha` for 30 days were read 10 seconds ago
- WHEN they are requested again with `capability=ui`, then after `POST /api/refresh`
- THEN the export did not run for the first request and ran again for the second

### REQ-QA-015: Pass rate per day
The trends SHALL hold `pass_rate`: one row per capability that has a passed or failed run in the window, sorted by name, each with `name` and `points`, one per day of `days` with `date`, `passed`, `failed` and `rate`, which is passed / (passed + failed) rounded to three decimals, or `null` when both are zero.

#### Scenario: Rate and gap
- GIVEN capability `ui` with 3 passed and 1 failed runs on 2026-11-26, none on 2026-11-27 and 2 passed on 2026-11-28, and one `blocked` run on 2026-11-27
- WHEN the trends are requested
- THEN the `ui` points read 0.75 on 2026-11-26, `null` on 2026-11-27 and 1.0 on 2026-11-28

### REQ-QA-016: Flaky cases
The trends SHALL hold `flaky`: each case that, among its runs of one `hash8` in the window, has both a passed and a failed run, with `case`, `capability` (of its last run), `flips` (the number of times the result changes between consecutive runs of the same `hash8`, summed over its `hash8` values), `last_result` and `last_at` (of its last passed or failed run), sorted by `flips` descending, then by `case`.

#### Scenario: Flips under one hash
- GIVEN `TC-UI-001` ran passed, failed, passed with `hash8` `aaaa1111`, and `TC-UI-002` ran failed with `aaaa2222` then passed with `bbbb2222`
- WHEN the trends are requested
- THEN `flaky` holds `TC-UI-001` with `flips` 2 and `last_result` `passed`, and not `TC-UI-002`

### REQ-QA-017: Time to fix
A failure streak of a case SHALL start at a failed run when the case has no open streak and end at its next passed run, whatever its `hash8`. The trends SHALL hold `time_to_fix` with `overall` and `by_capability` (sorted by name), each with `fixes` (the number of streaks that ended in the window) and `median_seconds` (the median of their durations, `null` when `fixes` is 0), and `still_failing`: each case whose streak is still open, with `case`, `capability`, `failing_since` (the streak's first failed run) and `bug` (the last non-empty `bug` of the streak's runs, else `null`), oldest first.

#### Scenario: Median and open streak
- GIVEN `TC-UI-001` failed at 10:00 and 11:00 and passed at 13:00, `TC-UI-003` failed at 09:00 and passed at 09:30, and `TC-BEADS-001` failed at 12:00 with `bug` `gin-console-3kd` and has not run since
- WHEN the trends are requested
- THEN `overall` has `fixes` 2 and `median_seconds` 6300, and `still_failing` holds `TC-BEADS-001` since 12:00 with `bug` `gin-console-3kd`

### REQ-QA-018: Trends tab
The Tests page SHALL show tabs Cases and Trends, Cases by default with the content of REQ-QA-010, and Trends at `?tab=trends`. The Trends tab SHALL request REQ-QA-014 for the current project (REQ-UI-124) with the browser's time zone and show a window choice of 7, 30 and 90 days kept in the URL as `days`, the capability filter kept as `capability` and shared with the Cases tab, a line chart of REQ-QA-015 with one line per capability and a gap on a `null` rate, the flaky cases with each case linking to its case page, the time to fix as durations in days, hours and minutes ("< 1 min" below a minute, "No fix yet" with no fix), and the cases still failing with how long they have failed and their bug linking to its bead page. The chart SHALL have a text label for assistive technology, and the tab SHALL NOT make the page scroll sideways at 390px.

#### Scenario: Open the tab
- GIVEN project `alpha` with the trends of REQ-QA-015 to REQ-QA-017
- WHEN the user opens `/tests?project=alpha&tab=trends`
- THEN the tab shows 30 days selected, the `ui` line, `TC-UI-001` among the flaky cases linking to `/tests/alpha/TC-UI-001`, a median of "1 h 45 min" and `TC-BEADS-001` linking to `/beads/alpha/gin-console-3kd`

#### Scenario: Change the window
- GIVEN the Trends tab of `alpha`
- WHEN the user picks 7 days and the capability `ui`
- THEN the URL holds `tab=trends&days=7&capability=ui` and the tab requests `days=7&capability=ui`

### REQ-QA-019: Trends empty and failed states
WHEN the trends cannot be read, the Trends tab SHALL show, instead of its content, the texts of REQ-QA-013 for the causes `missing` and `outdated` and the error with a "Try again" control otherwise, while the Cases tab keeps working; it SHALL show "No test runs in the last <n> days. gin-qa records them when a case result, an e2e run or a tests run is written." when the window has no passed or failed run, and a note "<n> lines of the run history could not be read" when `problems` is not empty.

#### Scenario: No runs
- GIVEN project `beta` whose export holds no run in the last 30 days
- WHEN the user opens its Trends tab
- THEN the tab reads "No test runs in the last 30 days." and shows no chart

#### Scenario: Old gin-qa on the Trends tab only
- GIVEN a gin-qa without the `runs` command whose case export works
- WHEN the user opens the Trends tab, then the Cases tab
- THEN the Trends tab reads "This gin-qa is too old; run `gin-workflow/install.sh --plugin gin-qa`" and the Cases tab shows the cases

## MODIFIED

## REMOVED

## RETIRED
