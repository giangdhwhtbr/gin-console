# Test coverage and release readiness

Epic: gin-console-rm-test-coverage
Kind: capability
Points: 8 (13 new and 3 modified REQs: a gin-qa source with a cache, 4 endpoints, a Tests page and a case page, the latest e2e run with step screenshots, a Readiness tab joining five sources (cases, trace, milestone, bugs, gates per epic); larger than gin-console-rm-evidence-images = 5, smaller than gin-console-rm-requirements = 13; was 5 at the roadmap)
Date: 2026-11-27

## Why

QA and the lead cannot tell from the console whether a milestone can ship. The traceability matrix shows "passed / total cases" per requirement, but no case by itself: not its type, its bug, nor what its last e2e run showed. Whether a milestone's requirements all have cases, whether those cases passed since their requirements changed, whether a P0 or P1 bug is open and whether every epic shipped are four separate searches across gin-qa, the specs, Beads and `gin state`.

Goal and scope after the epic's comments: QA and the lead see whether a milestone can ship. A Tests page shows the cases by capability, type and effective result (passed, failed, not run, outdated), the failed cases with their bug, and per case the latest e2e run with its step screenshots; a Readiness tab on the milestone page holds a checklist (every requirement has a case, every case passed since its requirement changed, no open P0 or P1 bug, every epic shipped). Out of scope: running tests. Requirements and traceability shipped (merge `82b6865`): the console runs `gin specs trace --all`, whose cases carry only `id` and `effective_result`, and links a requirement to the epics that changed it through `changes[].epic`; this epic adds `gin-qa cases export` for the case fields and reuses the trace for the milestone's requirements.

Comments considered: 1, latest 2026-11-26T02:34:30Z

Facts measured on 2026-11-27 in gin-console:
- 935 cases (the roadmap's survey of 2026-11-21 counted 472): e2e 635, api 291, manual 9; effective results passed 539, not run 296, outdated 100, none failed or blocked; every case pins one requirement.
- `gin-qa cases export --format json` answers in about 0.6 s with about 1 MB; each case has `result`, `effective_result`, `run`, `bug` and `checked`, and no time of its own. gin-qa works out `outdated` from the case stamp and the pinned requirement hashes (gin-workflow `docs/reference/cli.md`, `gin-qa cases export`).
- An e2e run writes `qa/evidence/<stamp>/<tc-id>/result.json` with per-step `status`, `screenshot` and `error`, next to `NN.png`. `qa/evidence` is git-ignored, 694 MB, with 503 folders; 88 of the 639 `run` values point to folders deleted since; api runs leave `junit.xml` and no `result.json`.
- Gates come only from `gin state --workflow-id <epic> --format json` (values `satisfied`, `unmet`, `waived(<reason>)`, `unknown`); open bugs with their priority and source epic come from the Beads export (REQ-REPORTS-039, REQ-REPORTS-040).
- The Docker image installs gin but not gin-qa.

User decisions 2026-11-27:
- **Pages:** a new Tests entry in the main navigation with a case page; the checklist is a Readiness tab of the milestone page.
- **Results:** the results item passes only when every case of the milestone's requirements is `passed`; not run, outdated, failed and blocked all fail it.
- **Bugs:** open P0 and P1 bugs whose source epic is in the milestone, and those of no known source; bugs of another milestone's epics do not count.
- **Gates:** all five gates of every epic, `shipped` included; `waived(...)` counts as passed.
- **Architecture:** the server works out the checklist in one endpoint of a new `qa` context; the browser sends a case id and a step number for a screenshot, never a path (ADR 0007).

Assumptions (defaults taken without a question):
- The latest run of a case is the folder its `run` names; the run history of `gin-qa runs export` is left to gin-console-rm-test-trends.
- The milestone's requirements are those the trace links, through an `added` or `modified` change, to one of its epics, open or archived, and not removed.
- The first item is named "Every requirement has a case", not "covered", which the matrix uses for "every case passed".
- A case's bug is shown on the list only when the case is `failed`; the case page shows it always.
- The Docker image keeps gin-qa out; the Tests page says "gin-qa is not installed on the console host" there.
- No test starts gin-qa or gin (AGENTS.md).

## What Changes

- **Backend (new context `qa`):** `GET /api/qa/cases`, `GET /api/qa/cases/{project}/{id}`, `GET /api/qa/cases/{project}/{id}/run/steps/{n}/screenshot` and `GET /api/qa/readiness/{project}/{milestone}`, over `gin-qa cases export` with a 60 second cache, the trace, the milestone, the Beads export and `gin state` per epic.
- **Tests page and case page:** counts per capability and type, a filtered list, the case with its bug and latest run, a lightbox over the step screenshots.
- **Milestone page:** a Readiness tab.
- **Main navigation:** a Tests link between Requirements and Reports.
- **ADR 0007:** reading gin-qa results and e2e run files.

## User Stories

### US-1: See test coverage
As a QA, I want the cases of a project counted by capability, type and effective result, so that I see where tests are missing, outdated or failing.
REQ: REQ-QA-001, REQ-QA-002, REQ-QA-003, REQ-QA-010, REQ-QA-013, REQ-UI-055, REQ-UI-124

Acceptance criteria:
- Tests in the main navigation opens a page with a table per capability and per type, each count by effective result, and the list of cases.
- Activating a count filters the list to that capability or type and result, and the filters stay in the URL.
- A case whose last recorded result differs from its effective result shows both.
- A project without gin-qa, or without cases, says why instead of showing empty tables.

### US-2: Failed cases with their bug
As a developer, I want each failed case shown with the bug filed for it, so that I go from the failure to the work that fixes it.
REQ: REQ-QA-004, REQ-QA-010

Acceptance criteria:
- Filtering on failed lists each failed case with a link to its bug's bead page.
- A passed case that still names a bug does not show it in the list.
- The case page shows the bug's title, status and priority, or only its id when the bead is not in the project.

### US-3: Latest e2e run of a case
As a QA, I want to see the steps and screenshots of a case's latest e2e run, so that I see where it failed without opening the evidence folder.
REQ: REQ-QA-004, REQ-QA-005, REQ-QA-006, REQ-QA-011

Acceptance criteria:
- The case page lists each step of the latest run with its status, error and a thumbnail, and a thumbnail opens the screenshot large.
- A run folder that is not on this host, a case never run, and unreadable run files each show their reason.
- A `run` or screenshot name that leaves the project, a symlink out, a file that is not an image and a file over 10 MB are never served.

### US-4: Release readiness of a milestone
As a lead, I want a checklist on the milestone page that says whether it can ship and what stands in the way, so that I decide the release from one place.
REQ: REQ-QA-007, REQ-QA-008, REQ-QA-009, REQ-QA-012, REQ-MILESTONE-UI-018

Acceptance criteria:
- The Readiness tab shows "Ready", "Not ready" or "Unknown" and four items with a mark and a count: every requirement has a case, every case passed since its requirement changed, no open P0 or P1 bug, every epic shipped.
- Each item's list links to the requirements without a case, the cases not passed, the open bugs and the epics with the gate they wait on.
- A source that cannot be read makes its items unknown with the error, and never makes them pass.

## Capabilities Affected

| Capability | REQs | Assets / Diagrams / Use Cases |
|---|---|---|
| `qa` (new) | `REQ-QA-001` to `REQ-QA-013` | `docs/specs/qa/diagrams/case-run-activity.md`, `docs/specs/qa/diagrams/readiness-activity.md`, `docs/specs/qa/diagrams/readiness-state.md`, `docs/specs/qa/use-cases/review-test-results.md`, `docs/specs/qa/use-cases/check-release-readiness.md` |
| `ui` | modified `REQ-UI-055`, `REQ-UI-124` | none |
| `milestone-ui` | modified `REQ-MILESTONE-UI-018` | none |

Decision: `docs/adr/0007-console-reads-qa-results.md`.

## Non-goals

- Running tests or recording results from the console.
- The run history and trends of cases (gin-console-rm-test-trends).
- Reading `qa/cases` files directly, or working out `outdated` again.
- Installing gin-qa in the Docker image.

## Success Criteria

- On this host, the Tests page of gin-console shows 935 cases with the counts of `gin-qa cases export`, and the page of `TC-UI-115` shows its latest run from `qa/evidence/2026-11-23T10-34-33` with its screenshot.
- The Readiness tab of milestone `gin-console-9ge` lists its epics' requirements without a case, its cases not passed, its open P0 and P1 bugs and its epics not shipped, each linked.
- `pytest`, `ruff`, `mypy`, `vitest`, `typecheck`, `lint` and `build` pass with each REQ named in a test, and `gin-qa cases check --change gin-console-rm-test-coverage` prints `ok`.
