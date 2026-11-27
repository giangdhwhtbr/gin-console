# Design: Test coverage and release readiness

Epic: gin-console-rm-test-coverage

## Architecture

Backend, new context `gin_console/qa/`:
- `source.py`: a `GinQaRunner` protocol (`__call__(args, cwd) -> Any`), injected into `create_app` as `run_gin_qa`; the real one calls `run_json(["gin-qa", *args], cwd, timeout=30)` of `projects/collect.py`. `load_cases(run, cwd)` runs `cases export --format json` and validates only the fields it uses into `CaseExport`; a missing `gin-qa` becomes `QaError(cause="missing")`, no `cases` list or a case without `effective_result` `QaError(cause="outdated")`. `projects/collect.py` `_resolve_cmd` also maps `gin-qa` to its `.cmd` shim or Git Bash on Windows, as it does `gin`.
- `runs.py`: the latest run of REQ-QA-005. `latest_run(entry, case)` checks the `run` text with `beads/images.locate` rules, resolves the folder inside `entry.path`, reads `<run>/<id lower>/result.json` with a 1 MB cap, and marks each step's `screenshot` through `beads/images` checks (`check` on the resolved file, inside the project only, no `evidence_roots`). `read_screenshot(entry, case, n)` repeats the check on the open file and returns bytes and media type. The shared checks become public functions of `beads/images.py` instead of `_load`, without changing their behaviour.
- `models.py`: `CaseRow`, `CaseCounts` (`name`, `passed`, `failed`, `blocked`, `not_run`, `outdated`, `other`, `total`), `CaseList`, `CaseDetail` (`bug: CaseBug | None`, `latest_run: LatestRun | None`, `latest_run_reason`), `LatestRun`, `RunStep`, `Readiness`, `ReadinessItem` (`state`, `note`, `error`, one typed list per item), `QaErrorBody` (`error`, `cause`).
- `service.py`: pure functions. `build_list(export)`; `case_detail(export, snapshot, entry, id)`; `readiness(detail, trace, export, snapshot, gates)` takes the milestone (`milestones/source.show_milestone`), the trace (`requirements/source.load_trace`), the export, the snapshot (bugs through `reports/bugs.is_bug` and `source_epic`) and the gates per epic, and returns the four items and the verdict of REQ-QA-008. No I/O, so every rule is a unit test.
- `router.py`: the four endpoints. The project check (`project_dir`, REQ-AUTH-007) runs before any cache. Caches are `beads/service.KeyedCache`: the export per project (60 s, one run at a time, failures not kept), the trace per project (60 s), the gates per (project, epic) (60 s); all are cleared through `on_refresh`. Gates run on a `ThreadPoolExecutor(max_workers=4)` over `projects/collect.collect_epic_workflow`, a `BlockError` giving `unknown` for that epic.
- `app.py`: `create_app(..., run_gin_qa=...)` and `build_qa_router(settings, run_gin_qa, run_gin, run_gw, run_epic_workflow, read_beads, clock, on_refresh, projects)`.
- `AGENTS.md` and `README.md` name the Tests page and ADR 0007.

Frontend, new feature `features/qa/`:
- `api.ts`: types and guards that check only the fields the pages use, so a key added by a later gin-qa does not fail them.
- `TestsPage.tsx` (route `/tests`): `CountsTable.tsx` (one per grouping, scrolling inside its frame at 390px), `CaseList.tsx`, `filters.ts` (URL `capability`, `type`, `result`, `q`).
- `CasePage.tsx` (route `/tests/<project>/<id>`): requirements linking to `/requirements/matrix?project=…&req=…`, the bug, and `LatestRun.tsx` with thumbnails and the lightbox.
- `QaError.tsx`: the states of REQ-QA-013.
- `features/milestones/ReadinessTab.tsx`, loaded from `MilestonePage.tsx` for `tab=readiness`, fetching `GET /api/qa/readiness/...` through `features/qa/api.ts`.
- `features/beads/images/Lightbox.tsx`: takes a list of `{src, caption}` instead of `BeadImage`, so the case page reuses it; the bead page passes its images mapped to that shape.
- `app/App.tsx` (lazy routes), `app/Layout.tsx` (`NAV` gets Tests with a `FlaskConical` icon), `app/project.ts` and `app/origin.ts` (project switch and back-links for `/tests`).

Rules of the change: gin-qa owns results; the console reads, counts and joins them, and serves a screenshot only by case and step number.

## Data Flow

- [Cases and latest run activity](docs/specs/qa/diagrams/case-run-activity.md) (use case: [Review test results](docs/specs/qa/use-cases/review-test-results.md)).
- [Release readiness activity](docs/specs/qa/diagrams/readiness-activity.md) (use case: [Check release readiness](docs/specs/qa/use-cases/check-release-readiness.md)).
- [Readiness verdict](docs/specs/qa/diagrams/readiness-state.md).

## Error Handling

- gin-qa: not found gives 502 `cause: missing`; output without `cases` or a case without `effective_result` gives `outdated`; a timeout, a non-zero exit or JSON that does not parse give 502 with the message and `cause: null`. Failures are not cached.
- Case detail: an unknown case gives 404; a `bug` naming a bead outside the snapshot keeps only its `id`; a snapshot that cannot be read leaves `bug` with its `id` and does not fail the detail.
- Latest run: an empty `run` gives `no_run`; a folder or `result.json` missing gives `not_on_host`; a `run` with `..`, `\`, NUL or `:`, a folder that resolves outside the project, a `result.json` over 1 MB or not an object with `steps` give `invalid`. A screenshot name with `/` or `..`, a symlink out, a FIFO, a text file named `.png` or a file over 10 MB is never marked or served; the screenshot route answers one 404 for every failure.
- Readiness: an unknown milestone gives 404; `gin milestone show` failing gives 502 (nothing to scope); the export or the trace failing makes `cases` and `results` `unknown` with the error; the snapshot failing makes `bugs` `unknown`; one epic's `gin state` failing lists it as `unknown` and makes `gates` `unknown` only when no epic fails. Never `pass` on a failed source.
- Frontend: each page shows its own error with "Try again"; the Readiness tab shows the item's error inside the item.

## Testing

- `pytest`, with `tests/fake_gin_qa.py` (canned exports per cwd, call log, timeout and not-found modes) and a trimmed fixture of the real export (cases of several capabilities and types, each effective result):
  - `test_qa_source.py`: fields kept and unknown keys ignored, `missing`, `outdated`, timeout, bad JSON.
  - `test_qa_api.py`: the list and its counts, `other`, the detail with a bug in and out of the snapshot, 404s, the hidden project before the cache (REQ-AUTH-007), the cache (two readers, refresh, failure).
  - `test_qa_runs.py`: `result.json` read, `no_run`, `not_on_host`, `invalid`, the refused `run` and screenshot names, a symlink out, a FIFO, a text `.png`, 11 MB; `test_qa_screenshot_api.py`: 200 with the headers, every 404.
  - `test_qa_readiness.py` (service): scope by `changes[].epic` and `op`, removed requirements left out, each item pass, fail and unknown, bugs of another milestone left out and of no source counted, `waived` gates, closed epics, no requirement, no epic, verdicts; `test_qa_readiness_api.py`: four `gin state` at a time, the gate cache, 404 and 502.
- `vitest`: `Layout.test.tsx` (seven links in order), `TestsPage.test.tsx` (tables, count as filter, URL, failed with bug, 390px), `CasePage.test.tsx` (latest run, reasons, lightbox), `ReadinessTab.test.tsx` (verdicts, marks not by colour alone, lists and links, loading and error), `MilestonePage.test.tsx` (`tab=readiness`), `Lightbox.test.tsx` (the new shape, bead images unchanged), `QaError.test.tsx`.
- QA track: gin-qa cases for each new and modified REQ, api cases for the four endpoints and the path rules, e2e specs for the Tests page, a case page with screenshots and the Readiness tab, and a manual check on this host against the live export (935 cases) and milestone `gin-console-9ge`.

## Open Technical Questions
