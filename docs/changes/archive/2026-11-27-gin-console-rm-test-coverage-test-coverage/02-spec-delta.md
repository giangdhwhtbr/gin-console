# Spec Delta: Test coverage and release readiness

The effective result of a case is its `effective_result` in `gin-qa cases export` (`passed`, `failed`, `blocked`, `not run` or `outdated`); the console never works it out again.

## ADDED

### REQ-QA-001: Case list
WHEN a client requests `GET /api/qa/cases?project=<name>`, the server SHALL run `gin-qa cases export --format json` in the project's directory and SHALL return `cases`, one row per case sorted by `id`, each with `id`, `title`, `capability`, `type`, `priority`, `result`, `effective_result`, `reqs` (the `id` of each entry of its `reqs`), `bug` (the case's `bug`, or `null` when it is empty) and `file`, and without its steps; and `counts`: `by_capability` and `by_type`, each a list of rows sorted by name, with `name` and the number of cases per effective result in `passed`, `failed`, `blocked`, `not_run`, `outdated` and `other` (any other value), and `total`. The server SHALL ignore keys of the export it does not use.

#### Scenario: Rows and counts
- GIVEN project `alpha` whose export holds `TC-UI-002` (ui, e2e, `passed`), `TC-UI-001` (ui, api, `outdated`, result `passed`) and `TC-BEADS-001` (beads, e2e, `not run`)
- WHEN a client requests `/api/qa/cases?project=alpha`
- THEN `cases` lists `TC-BEADS-001`, `TC-UI-001` and `TC-UI-002`, `TC-UI-001` has `result` `passed` and `effective_result` `outdated`, `by_capability` is `beads` (`not_run` 1, `total` 1) then `ui` (`passed` 1, `outdated` 1, `total` 2), and `by_type` is `api` (`outdated` 1) then `e2e` (`passed` 1, `not_run` 1)

#### Scenario: Unknown result and new keys
- GIVEN an export whose case `TC-UI-003` has `effective_result` `skipped` and a key `flaky` the console does not know
- WHEN the list is requested
- THEN `TC-UI-003` has `effective_result` `skipped`, is counted under `other`, and the response is 200

### REQ-QA-002: QA errors
The QA endpoints SHALL respond 404 for a project that is not configured, whose directory is missing, or that REQ-AUTH-007 hides from the user, checked before any cache is read, and 502 with `error` and `cause` WHEN `gin-qa` fails, does not answer in 30 seconds, or prints what the server does not understand: the cause `missing` when `gin-qa` is not found, `outdated` when the output has no `cases` list or a case without `effective_result`, else `null`. A failure of one source SHALL NOT fail an endpoint that does not need it.

#### Scenario: No gin-qa
- GIVEN a console host without `gin-qa`
- WHEN the case list of `alpha` is requested
- THEN the response is 502 with the cause `missing`

#### Scenario: Old gin-qa
- GIVEN a `gin-qa` whose export has cases without `effective_result`
- WHEN the case list is requested
- THEN the response is 502 with the cause `outdated`

#### Scenario: Timeout
- GIVEN an export that does not answer in 30 seconds
- WHEN the case list is requested
- THEN the response is 502 with an error naming the timeout and the cause `null`

#### Scenario: Hidden project
- GIVEN auth is on and user `bao` may see only `beta`
- WHEN `bao` requests the case list, a case and the readiness of `alpha`
- THEN every response is 404 and `gin-qa` did not run

### REQ-QA-003: QA cache
Type: non-functional
Category: performance
The server SHALL keep the answer of `gin-qa cases export` for 60 seconds per project, SHALL run at most one per project at a time, SHALL NOT keep a failure, and SHALL forget it on `POST /api/refresh`.

#### Scenario: Two readers
- GIVEN no kept answer
- WHEN two clients request the case list of the same project at once
- THEN the export runs once and both get its answer

#### Scenario: Refresh
- GIVEN a kept answer
- WHEN `POST /api/refresh` is sent and the case list is requested
- THEN the export runs again

#### Scenario: Failure
- GIVEN an export that failed
- WHEN the case list is requested again
- THEN the export runs again

### REQ-QA-004: Case detail
WHEN a client requests `GET /api/qa/cases/{project}/{id}`, the server SHALL return the case with the fields of REQ-QA-001 plus `preconditions`, `steps` and `expected` as the export lists them, `bug` as `null` when the case has none, else `id` and, when that bead is in the project's export snapshot (REQ-BEADS-012), its `title`, `status` and `priority`, and `latest_run` and `latest_run_reason` (REQ-QA-005); and SHALL respond 404 when the project or the case does not exist.

#### Scenario: Failed case with its bug
- GIVEN case `TC-UI-115` with effective result `failed` and `bug` `gin-console-3kd`, an open P1 bead of the project
- WHEN a client requests `/api/qa/cases/alpha/TC-UI-115`
- THEN `bug` is `{id: "gin-console-3kd", title: …, status: "open", priority: 1}` with the steps and expected results of the case

#### Scenario: Bug not in the snapshot
- GIVEN case `TC-UI-116` whose `bug` names a bead the project does not have
- WHEN its detail is requested
- THEN `bug` has only its `id`

#### Scenario: Unknown case
- GIVEN no case `TC-UI-999`
- WHEN a client requests `/api/qa/cases/alpha/TC-UI-999`
- THEN the response is 404

### REQ-QA-005: Latest run of a case
Type: business-rule
The latest run of a case SHALL be the run its `run` names. The server SHALL read `<run>/<id in lower case>/result.json` only when `run` is a relative path with no `..` part, no `\`, no NUL and no `:`, and the folder, with every symlink resolved, is inside the project's `path`; it SHALL read at most 1 MB of it. `latest_run` SHALL be `null` with `latest_run_reason` `no_run` when `run` is empty, `not_on_host` when the folder or `result.json` does not exist, and `invalid` when `run` breaks those rules, `result.json` is over 1 MB or is not a JSON object with a `steps` list. Otherwise `latest_run_reason` SHALL be `null` and `latest_run` SHALL hold `folder` (the `run` as written), `status`, `started`, `finished` and `error` of `result.json`, and `steps`, each with `n` (1, 2, … in order), `title`, `status`, `error` and `screenshot`: true only when the step's `screenshot` is a plain file name (letters, digits, `.`, `_` and `-`, no `/`) that names, in that folder, an image available as REQ-BEADS-027 says for a file inside the project.

#### Scenario: E2E run
- GIVEN case `TC-UI-115` with `run` `qa/evidence/2026-11-23T10-34-33` and the file `qa/evidence/2026-11-23T10-34-33/tc-ui-115/result.json` with status `passed` and two steps whose screenshots `01.png` and `02.png` exist, `02.png` being text
- WHEN its detail is requested
- THEN `latest_run` has `folder` `qa/evidence/2026-11-23T10-34-33`, `status` `passed`, and steps 1 and 2 with `screenshot` true and false

#### Scenario: No run here
- GIVEN case `TC-UI-120` with an empty `run`, case `TC-UI-121` whose run folder was deleted, and api case `TC-SERVER-001` whose run folder has no `tc-server-001/result.json`
- WHEN their details are requested
- THEN `latest_run` is `null` with the reasons `no_run`, `not_on_host` and `not_on_host`

#### Scenario: Refused run
- GIVEN case `TC-UI-122` with `run` `../outside/r1`, and case `TC-UI-123` whose `result.json` names the screenshot `../../secret.png`
- WHEN their details are requested
- THEN `TC-UI-122` has `latest_run` `null` with the reason `invalid`, and the step of `TC-UI-123` has `screenshot` false

### REQ-QA-006: Step screenshot request
WHEN a client requests `GET /api/qa/cases/{project}/{id}/run/steps/{n}/screenshot`, the server SHALL find step `n` of the case's latest run again as REQ-QA-005 says and, when its `screenshot` is true after checking the file again as REQ-BEADS-027 says, SHALL respond 200 with the file's bytes, `Content-Type` from its first bytes, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox; default-src 'none'`, `Content-Disposition: inline` and `Cache-Control: private, no-cache`. It SHALL respond 404 with the body `{"error":"not found"}`, without saying why, in every other case, and SHALL NOT take a path from the client.

#### Scenario: Served
- GIVEN step 1 of the latest run of `TC-UI-115`, a PNG screenshot of 150 KB
- WHEN a client requests `/api/qa/cases/alpha/TC-UI-115/run/steps/1/screenshot`
- THEN the response is 200 with `image/png`, the file's bytes and the four headers

#### Scenario: Not served
- GIVEN step 2 of that run, whose screenshot is text, and a run with two steps
- WHEN a client requests steps 2, 3 and 0, and step 1 of `TC-UI-999`
- THEN every response is 404 with the same body

### REQ-QA-007: Readiness scope
Type: business-rule
The readiness of a milestone SHALL cover: its epics, every epic that `gin milestone show <milestone> --json` lists, closed or not; its requirements, every requirement of `gin specs trace --all` whose `state` is not `removed` and that has a change with `op` `added` or `modified` whose `epic` is one of its epics, archived or not; and its cases, every case of `gin-qa cases export` with one of its requirements among its `reqs`.

#### Scenario: Requirements of the milestone
- GIVEN milestone `m2` with epics `e1` and `e2`, `REQ-UI-001` added by `e1`, `REQ-UI-002` modified by `e2` in an archived change, `REQ-UI-003` modified by `e9` of another milestone, and `REQ-UI-004` added by `e1` and since removed
- WHEN its readiness is worked out
- THEN its requirements are `REQ-UI-001` and `REQ-UI-002`, and its cases are those that list either of them

### REQ-QA-008: Readiness checklist
Type: business-rule
The readiness of a milestone SHALL have four items, each with `state` `pass`, `fail` or `unknown` and the list that explains it:
- `cases`, "Every requirement has a case": `pass` when each requirement of the milestone (REQ-QA-007) has at least one case; the list holds the requirements without a case;
- `results`, "Every case passed since its requirement changed": `pass` when each case of the milestone has the effective result `passed`; the list holds the other cases with their effective result and `bug`;
- `bugs`, "No open P0 or P1 bug": `pass` when no bug (REQ-REPORTS-039) that is not closed and has `priority` 0 or 1 has its source epic (REQ-REPORTS-040) among the milestone's epics or has no source epic; the list holds those bugs, each with `id`, `title`, `priority` and its source epic or `null`;
- `gates`, "Every epic shipped": `pass` when each epic of the milestone has its five gates (`requirement_confirmed`, `plan_approved`, `orchestration_ready`, `implementation_complete`, `shipped`) of `gin state --workflow-id <epic> --format json` each `satisfied` or starting with `waived`; the list holds the other epics, each with its first gate in that order that is neither, or `unknown` when its `gin state` failed.

An item SHALL be `unknown` when a source it needs fails (the export or the trace for `cases` and `results`, the export snapshot for `bugs`), and `gates` SHALL be `unknown` when no epic has an unmet gate and the `gin state` of at least one epic failed. `cases` and `results` SHALL be `pass` with the note "No requirement changed" when the milestone has no requirement, and `gates` with the note "No epic" when it has no epic. The checklist SHALL have `verdict` `ready` when the four items are `pass`, `not_ready` when one is `fail`, else `unknown`.

#### Scenario: Not ready
- GIVEN milestone `m2` whose requirement `REQ-UI-001` has `TC-UI-001` (`passed`) and `TC-UI-002` (`outdated`), whose requirement `REQ-UI-002` has no case, with an open P1 bug from `e1`, an open P0 bug of unknown source, an open P1 bug from `e9` of another milestone, and epic `e2` whose `implementation_complete` is unmet
- WHEN its readiness is worked out
- THEN `cases` fails listing `REQ-UI-002`, `results` fails listing `TC-UI-002` as `outdated`, `bugs` fails listing the two bugs and not the one of `e9`, `gates` fails listing `e2` at `implementation_complete`, and the verdict is `not_ready`

#### Scenario: Ready
- GIVEN milestone `m1` whose cases are all `passed`, every requirement with a case, no open P0 or P1 bug in scope, and both epics with every gate `satisfied` but `plan_approved` of one `waived(spike only)`
- WHEN its readiness is worked out
- THEN the four items pass and the verdict is `ready`

#### Scenario: Not run, failed and blocked
- GIVEN a milestone whose cases are `TC-1` (`not run`), `TC-2` (`failed`, bug `b-7`) and `TC-3` (`blocked`)
- WHEN its readiness is worked out
- THEN `results` fails listing the three, `TC-2` with `b-7`

#### Scenario: Unknown
- GIVEN milestone `m2` with no open P0 or P1 bug, every gate of `e1` satisfied, a `gin state` of `e2` that fails, and a console host without `gin-qa`
- WHEN its readiness is worked out
- THEN `cases` and `results` are `unknown`, `bugs` passes, `gates` is `unknown` listing `e2` as `unknown`, and the verdict is `unknown`

#### Scenario: Technical milestone
- GIVEN milestone `m3` whose only epic changed no requirement and is shipped
- WHEN its readiness is worked out
- THEN `cases` and `results` pass with the note "No requirement changed", and the verdict is `ready` when `bugs` passes

### REQ-QA-009: Readiness request
WHEN a client requests `GET /api/qa/readiness/{project}/{milestone}`, the server SHALL return `milestone` (`id` and `title`), `epics` (`id`, `title` and `status` of each epic of REQ-QA-007), `generated_at`, `verdict` and the four items of REQ-QA-008, each with `state`, `note` (or `null`), `error` (the message of the source that made it `unknown`, or `null`) and its list. It SHALL take the export from the cache of REQ-QA-003 and keep the answer of `gin specs trace --all` as REQ-REQUIREMENTS-006 says, run `gin state` for at most four epics at a time, keep each epic's gates for 60 seconds, forget them on `POST /api/refresh`, and respond 404 when the project is not found (REQ-QA-002) or the milestone does not exist, and 502 with `error` when `gin milestone show` fails.

#### Scenario: Checklist served
- GIVEN milestone `m2` of `alpha` with three epics
- WHEN a client requests `/api/qa/readiness/alpha/m2`
- THEN the response is 200 with the milestone, three epics, a verdict and the items `cases`, `results`, `bugs` and `gates` in that order

#### Scenario: Gates fan out
- GIVEN milestone `m4` with ten epics and no kept gates
- WHEN its readiness is requested twice within 60 seconds
- THEN no more than four `gin state` processes ran at a time, each epic's ran once, and the second answer started no `gin state`

#### Scenario: Unknown milestone
- GIVEN no milestone `m9` in `alpha`
- WHEN a client requests `/api/qa/readiness/alpha/m9`
- THEN the response is 404

### REQ-QA-010: Tests page
The frontend SHALL offer a Tests page at `/tests?project=<name>` that shows, for the current project (REQ-UI-124), a table of cases per capability and one per type, each row with the counts of REQ-QA-001 by effective result and its total, and below them the cases, each with its id and title linking to its case page, its type, its priority, its effective result, "Last recorded: <result>" when `result` differs, and its bug linking to the bead page when the effective result is `failed`. It SHALL filter the cases by capability, type, effective result and a search on id and title, kept in the URL as `capability`, `type`, `result` and `q`, and activating a count in a table SHALL set the filters of its row and column. Neither table SHALL make the page scroll sideways at 390px.

#### Scenario: Counts and list
- GIVEN project `alpha` with the cases of REQ-QA-001
- WHEN the user opens `/tests?project=alpha`
- THEN the capability table shows `beads` and `ui` with their counts, and the list shows the three cases with `TC-UI-001` reading "outdated" and "Last recorded: passed"

#### Scenario: Count as filter
- GIVEN the Tests page of `alpha`
- WHEN the user activates the `outdated` count of `ui`
- THEN the URL holds `capability=ui&result=outdated` and the list shows `TC-UI-001` only

#### Scenario: Failed with bug
- GIVEN case `TC-UI-115` failed with `bug` `gin-console-3kd` and case `TC-UI-116` passed with `bug` `gin-console-4aa`
- WHEN the user filters on `failed`
- THEN `TC-UI-115` is listed with a link to `/beads/alpha/gin-console-3kd`, and `TC-UI-116` is not listed

### REQ-QA-011: Case page
The frontend SHALL show a case at `/tests/<project>/<id>` with its id, title, capability, type, priority and effective result, its requirements linking to their details in the traceability matrix (REQ-REQUIREMENTS-015), its preconditions, steps and expected results, its bug with id, title, status and `P<n>` linking to the bead page, and a "Latest run" section: the run's folder, start time, status and error, and each step with its number, title, status, error and, when `screenshot` is true, a thumbnail from REQ-QA-006 that opens a lightbox working as REQ-BEADS-030 says over the run's screenshots, with the step's number and title as caption; WHEN `latest_run` is `null`, the section SHALL read "No run recorded" for `no_run`, "Run folder is not on this host" for `not_on_host` and "Run files cannot be read" for `invalid`.

#### Scenario: Run with screenshots
- GIVEN case `TC-UI-115` whose latest run has two steps, step 1 with a screenshot and step 2 failed with an error and none
- WHEN the user opens `/tests/alpha/TC-UI-115` and activates the thumbnail of step 1
- THEN the section shows both steps, step 2 with its error and no thumbnail, and the lightbox shows step 1's screenshot

#### Scenario: Run not here
- GIVEN case `TC-UI-121` whose run folder is not on the console host
- WHEN its page opens
- THEN "Latest run" reads "Run folder is not on this host"

### REQ-QA-012: Readiness tab
WHILE the Readiness tab of a milestone page is shown, the page SHALL show the verdict of REQ-QA-009 as "Ready", "Not ready" or "Unknown", and the four items in order, each with its title, a mark for `pass`, `fail` or `unknown` that is not told by colour alone, the number of entries of its list, its note or error, and a control that shows its list: requirements linking to their details in the traceability matrix, cases linking to their case pages with their effective result and bug, bugs linking to their bead pages with `P<n>` and their source epic or "Unknown source", and epics linking to their bead pages with the gate they wait on. WHILE the checklist loads, the tab SHALL say so, and WHEN the request fails it SHALL show the error and a "Try again" control.

#### Scenario: Not ready milestone
- GIVEN the readiness of `m2` of REQ-QA-008 "Not ready"
- WHEN the user opens `/milestones/alpha/m2?tab=readiness` and opens the list of `gates`
- THEN the tab reads "Not ready", each item shows a fail mark and its count, and the list shows `e2` waiting on `implementation_complete` with a link to `/beads/alpha/e2`

#### Scenario: Failed request
- GIVEN `gin milestone show` fails for `m2`
- WHEN the Readiness tab opens
- THEN it shows the error and "Try again"

### REQ-QA-013: QA empty and failed states
WHEN the case list or a case cannot be read, the Tests page and the case page SHALL show, instead of their content, "gin-qa is not installed on the console host" for the cause `missing`, "This gin-qa is too old; run `gin-workflow/install.sh --plugin gin-qa`" for `outdated`, and the error with a "Try again" control otherwise, and the Tests page SHALL show "No test cases yet. Write them with `/gin-qa:cases`." for a project whose export holds no case.

#### Scenario: Project without gin-qa
- GIVEN project `qwikfone` on a console host without `gin-qa`
- WHEN the user opens `/tests?project=qwikfone`
- THEN the page reads "gin-qa is not installed on the console host" and shows no table

#### Scenario: No cases
- GIVEN project `beta` whose export holds an empty `cases` list
- WHEN the user opens `/tests?project=beta`
- THEN the page reads "No test cases yet. Write them with `/gin-qa:cases`."

## MODIFIED

### REQ-UI-055: Main navigation
<!-- base: 9421147f5e31c14f6c33a6f706c38cc489fde7792a70f7678b32b5daa34e68c8 -->
The frontend SHALL show one navigation landmark labelled "Main" on every page, holding exactly one link each to Overview, Beads, My work, Milestones, Requirements, Tests and Reports, in that order, Overview going to `/` and the others to `/beads`, `/my-tasks`, `/milestones`, `/requirements`, `/tests` and `/reports` with `?project=<current project>` (REQ-UI-124).

#### Scenario: Seven links
- GIVEN any page is shown and the current project is `a`
- WHEN the page loads
- THEN the "Main" navigation holds the links Overview, Beads, My work, Milestones, Requirements, Tests and Reports, one each, going to `/`, `/beads?project=a`, `/my-tasks?project=a`, `/milestones?project=a`, `/requirements?project=a`, `/tests?project=a` and `/reports?project=a`

#### Scenario: Short label
- GIVEN a window 390px wide, or the icon rail
- WHEN any page is shown
- THEN the Requirements link shows "REQs", has the accessible name "REQs (Requirements)", and no label is cut off or overlaps another

### REQ-UI-124: Current project
<!-- base: 12df924955e0a123fac34531d47cbc815c35671aa7b33402bb9b9377ee2b9e60 -->
The frontend SHALL take the current project, in this order: from the `project` query of the URL when it names a configured project whose directory exists; else the project last chosen in this browser tab; else the favorite project; else the first configured project. It SHALL remember as last chosen, for the browser tab, the project the Beads, My Tasks, Milestones, Requirements, Tests, Reports, bead, milestone or case page (REQ-QA-011) shows and a project chosen in the switcher, and SHALL remember the favorite across tabs and visits. The Main navigation links Beads, My Tasks, Milestones, Requirements, Tests and Reports SHALL carry `?project=<current project>`. WHEN the Beads, My Tasks, Milestones, Requirements, Tests or Reports page opens without `project`, it SHALL show the current project and write it into the URL without adding a history entry. A remembered or favorite project that is no longer configured SHALL be skipped. IF the browser refuses to store a choice, THEN the choice SHALL last for the visit without an error.

#### Scenario: Links carry the project
- GIVEN the current project is `b`
- WHEN any page is shown
- THEN the Beads link goes to `/beads?project=b`, Milestones to `/milestones?project=b`, My Tasks to `/my-tasks?project=b`, Requirements to `/requirements?project=b`, Tests to `/tests?project=b`, and Reports to `/reports?project=b`

#### Scenario: Last chosen beats the favorite
- GIVEN the favorite is `a` and the user chose `b` earlier in this tab
- WHEN the user opens `/milestones`
- THEN the Milestones page of `b` is shown and the URL becomes `/milestones?project=b`

#### Scenario: Favorite in a new tab
- GIVEN the favorite is `c`
- WHEN the user opens `/beads` in a new browser tab
- THEN the Beads page of `c` is shown

#### Scenario: Removed project
- GIVEN the favorite `old` is no longer configured and nothing was chosen in this tab
- WHEN the user opens `/beads`
- THEN the first configured project is shown

#### Scenario: My Tasks of the current project
- GIVEN the current project is `b`
- WHEN the user opens `/my-tasks`
- THEN the My Tasks page of `b` is shown and the URL becomes `/my-tasks?project=b`

#### Scenario: Storage refused
- GIVEN the browser throws when a choice is stored
- WHEN the user chooses project `b` and opens Milestones
- THEN the Milestones page of `b` is shown and no error is shown

#### Scenario: Tests of the current project
- GIVEN the current project is `b`
- WHEN the user opens `/tests`, and then the case page `/tests/c/TC-UI-001`
- THEN the Tests page of `b` is shown with the URL `/tests?project=b`, and after the case page the current project is `c`

### REQ-MILESTONE-UI-018: Beads tab on the milestone page
<!-- base: 3dbf80c2001b1ddaf35ed5b03c4b629db95b9dd7f7d7bfe2bfd85a05ea580a9e -->
The milestone page SHALL offer the tabs Gantt, Beads, Retro (REQ-MILESTONE-UI-019) and Readiness (REQ-QA-012), kept in the URL as `tab` (`gantt` when absent or unknown, `beads`, `retro`, `readiness`), and SHALL treat `tab=graph` as `tab=beads` with `view=graph`. WHILE the Beads tab is shown, the page SHALL show the Beads views (REQ-UI-030) of the milestone's project with the milestone fixed to this one, no Milestone filter in the filter bar or its sheet (REQ-UI-142) and "Clear filters" leaving the milestone as it is (REQ-UI-143), SHALL keep their search, filters, view, selection and graph scope in the milestone page's URL with the names the Beads page uses, and SHALL fetch closed beads without "Show closed" WHILE the milestone is closed. WHEN the user changes tab, the page SHALL keep only `start` and `zoom` of the query besides `tab`.

#### Scenario: Beads tab
- GIVEN milestone `m2` of project `p` with epics `e1` and `e2` and a bead `x` under milestone `m3`
- WHEN the user opens `/milestones/p/m2?tab=beads`
- THEN the List view shows `e1` and `e2` and not `x`, and there is no Milestone filter

#### Scenario: View and filters in the URL
- GIVEN the Beads tab of `m2`
- WHEN the user chooses Board and the status "open"
- THEN the URL is `/milestones/p/m2?tab=beads&view=board&status=open` and reloading it shows the same Board and filter

#### Scenario: Clear filters keeps the milestone
- GIVEN the Beads tab of `m2` at `/milestones/p/m2?tab=beads&view=board&status=open`
- WHEN the user chooses "Clear filters"
- THEN the URL is `/milestones/p/m2?tab=beads&view=board` and the Board shows the beads of `m2`

#### Scenario: Changing tab
- GIVEN `/milestones/p/m2?tab=beads&view=board&status=open&start=2026-11-10&zoom=2w`
- WHEN the user chooses Gantt and then Beads
- THEN the URL is `/milestones/p/m2?start=2026-11-10&zoom=2w` and then `/milestones/p/m2?tab=beads&start=2026-11-10&zoom=2w`, and the List view shows no filter

#### Scenario: Old Graph link
- GIVEN a link to `/milestones/p/m2?tab=graph`
- WHEN it is opened
- THEN the Beads tab is shown on the Graph view

#### Scenario: Closed milestone
- GIVEN closed milestone `m1` whose beads are all closed
- WHEN the user opens its Beads tab with "Show closed" off
- THEN the closed beads of `m1` are shown

#### Scenario: Readiness tab
- GIVEN milestone `m2` of project `p`
- WHEN the user opens `/milestones/p/m2?tab=readiness`
- THEN the Readiness tab is shown and is the selected tab

## REMOVED
