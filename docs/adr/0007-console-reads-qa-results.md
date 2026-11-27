# The console reads gin-qa results and e2e run files

Date: 2026-11-27
Status: proposed

## Context
Epic gin-console-rm-test-coverage shows the cases of a project, the latest e2e run of a case with its step screenshots, and the release readiness of a milestone. gin-qa owns the case files and works out each case's `effective_result`, `outdated` included, from stamps and pinned requirement hashes; `gin-qa cases export --format json` prints every case with it (935 cases and about 1 MB in gin-console). An e2e run leaves `result.json` and one screenshot per step in `<run>/<tc-id>/`, under `qa/evidence/`, which is git-ignored: it exists only on the machine that ran the tests, and a case's `run` may name a folder deleted since. ADR 0004 lets the console read project files only inside `docs/changes` and the asset folders of `docs/specs`; the Evidence images of REQ-BEADS-027 serve images only inside the project folder, by a server-built index.

## Decision
The server runs `gin-qa cases export --format json` in a configured project's directory, with an injected runner, a 30 second limit and a 60 second cache, as it runs `gin specs trace` (REQ-REQUIREMENTS-006); it never reads `qa/cases` itself and never works out a result again. It reads one more kind of project file: `<run>/<tc-id>/result.json` of the folder a case's `run` names, at most 1 MB, when `run` passes the path text rules of REQ-BEADS-027 and resolves inside the project; and the screenshots that file names, as plain file names in that folder, served with the checks and headers of REQ-BEADS-027 and REQ-BEADS-028. The browser sends a case id and a step number, never a path. The readiness checklist is worked out on the server from the export, the trace, the milestone, the Beads export and `gin state` of each epic, at most four at a time. Reading `qa/cases` directly was rejected because gin-qa's stamps decide `outdated`; reading the run history (`gin-qa runs export`) is left to epic gin-console-rm-test-trends.

## Consequences
The Tests page and the Readiness tab need gin-qa on the console host; the Docker image does not install it, so they show "gin-qa is not installed" there. Screenshots show only on the host that ran the tests, or one that has its `qa/evidence`. A milestone page's Readiness tab starts up to one `gin state` per epic each minute, as the epic workflow of REQ-BEADS-020 does per bead page. Tests inject the gin-qa runner, so no test starts gin-qa.
