# Spec Delta: Beads jsonl

## ADDED

### REQ-BEADS-013: Stale export
The server SHALL record, each time it reads a project's `.beads/issues.jsonl`, the content of the project's embedded Dolt manifests (`.beads/embeddeddolt/*/.dolt/noms/manifest`), and SHALL report the project's export as stale WHILE that content differs from the recorded content and the file has not changed since; WHERE a project has no such manifest, its export SHALL never be stale. `GET /api/projects` SHALL include `stale` (a boolean) in the `beads` object of each project whose beads were read.

#### Scenario: Fresh export
- GIVEN the file was read when the manifest held `root-1`, and the manifest still holds `root-1`
- WHEN a client requests `GET /api/projects`
- THEN that project's `beads.stale` is `false`

#### Scenario: Write not exported
- GIVEN the file was read when the manifest held `root-1`
- WHEN a bead is written, the manifest now holds `root-2`, the file is unchanged, and a client requests `GET /api/projects` after its 5-second reuse (REQ-SERVER-008)
- THEN that project's `beads.stale` is `true` and its counts are those of the file

#### Scenario: Export catches up
- GIVEN a project whose export is stale
- WHEN the file is written again and a client requests `GET /api/projects` after its 5-second reuse
- THEN the file is read again and `beads.stale` is `false`

#### Scenario: No manifest
- GIVEN a project without an embedded Dolt manifest
- WHEN a client requests `GET /api/projects`
- THEN its `beads.stale` is `false`

### REQ-UI-103: Stale beads note
WHERE the `beads` object of a project in `GET /api/projects` has `stale: true`, the Beads page with that project selected and the My Tasks page SHALL show, above their list, the note "Beads of <project> may be out of date. Run `bd export -o .beads/issues.jsonl` in <project>." once per stale project, and SHALL show no note for a project whose `stale` is `false` or missing.

#### Scenario: Beads page
- GIVEN project A has `beads.stale: true`
- WHEN the Beads page opens with A selected
- THEN the note names A and the command, and the list is shown below it

#### Scenario: My Tasks
- GIVEN projects A with `beads.stale: true` and B with `beads.stale: false`
- WHEN My Tasks opens
- THEN one note names A, none names B, and the tasks of both are listed

#### Scenario: Not stale
- GIVEN project A whose `beads` has no `stale` key, or `stale: false`
- WHEN the Beads page opens with A selected
- THEN no note is shown

## MODIFIED

### REQ-BEADS-003: Safe, read-only commands
<!-- base: 0738d146a74730212b7fced3fba29fc5d9e8d16f68f9192a9167522e96f3fd01 -->
The server SHALL NOT run any `bd` command, SHALL only read files under the project's `.beads` directory, SHALL accept a bead `id` only when it matches `[A-Za-z0-9][A-Za-z0-9._-]*` and respond 404 otherwise, SHALL treat any `closed` value other than `1` as absent without failing the request, and SHALL never create, update, close or delete a bead or write a file under `.beads`.

#### Scenario: Option-like id
- GIVEN a request for the bead `--help` or `../x`
- WHEN the server handles it
- THEN the response is 404 and no file outside `.beads/issues.jsonl` was read

#### Scenario: Odd closed value
- GIVEN a request with `closed=../x` or `closed=true`
- WHEN the server handles it
- THEN the response is 200 and closed beads are left out

#### Scenario: No bd process
- GIVEN a project with `.beads/issues.jsonl`
- WHEN a client requests its list, a bead, its comments, `GET /api/projects` and a report
- THEN no `bd` process was started

### REQ-BEADS-004: One export per project
<!-- base: 4748f34fa094724e1d3a4b13f21bb6cbb82654e15dbe42017a44bebcd4fd1638 -->
The server SHALL answer the bead list, the bead detail, the comments, the project's `beads` summary and the reports of a project from one read of that project's `.beads/issues.jsonl` (REQ-BEADS-012), SHALL read the file of one project at most once at a time when requests overlap, and SHALL NOT keep an error result.

#### Scenario: Every view from one read
- GIVEN a project whose snapshot is current
- WHEN a client requests its list, its list with `closed=1`, a bead detail and that bead's comments
- THEN the file was read once

#### Scenario: Overlapping requests
- GIVEN two requests for the same project arrive while its file is read
- WHEN both complete
- THEN the file was read once

#### Scenario: Errors are not kept
- GIVEN the last read of the file failed
- WHEN the same request is made again
- THEN the file is read again

### REQ-BEADS-005: Failures
<!-- base: 34f6fb822c3bbe4ca19b8d338169de9363ef635f91f16dcc6b9302e5a8f547e8 -->
IF a project's `.beads/issues.jsonl` does not exist, THEN the server SHALL respond 502 with an `error` that names the file and says to run `bd config set export.auto true` and `bd config set export.interval 1s` in the project, then any bd write or `bd export -o .beads/issues.jsonl`; IF the file cannot be read or a non-empty line is not a JSON object, THEN the server SHALL respond 502 with an `error` that says which; and the server SHALL leave out of a list any bead whose fields have the wrong types instead of failing the list. The `beads` block of `GET /api/projects` SHALL carry the same message as its `error` (REQ-SERVER-007).

#### Scenario: Missing file
- GIVEN a project whose `.beads` has no `issues.jsonl`
- WHEN a client requests its list
- THEN the response is 502 and `error` names `.beads/issues.jsonl` and `bd config set export.auto true`

#### Scenario: Malformed line
- GIVEN a file whose second line is `[1, 2]`
- WHEN a client requests the list
- THEN the response is 502 and `error` says a line is not a JSON object

#### Scenario: One malformed bead
- GIVEN a file with 3 beads of which one has a numeric `title`
- WHEN a client requests the list
- THEN the 2 valid beads are returned

#### Scenario: Projects block
- GIVEN a project whose `.beads` has no `issues.jsonl`
- WHEN a client requests `GET /api/projects`
- THEN that project's `beads` is `{"error": "<the same message>"}` and its `workflow` has data

### REQ-BEADS-012: Export snapshot and refresh
<!-- base: c2347c7bbe5ccb2412319309bdc82373f7c93a96c5ddc8d90fd7aadb083910a8 -->
The server SHALL keep, per project, the beads that `.beads/issues.jsonl` holds (with their labels, dependencies and comments) and SHALL take a bead's `parent` from its `parent-child` dependency. It SHALL read the file again WHEN its modification time or size differs from when the snapshot was taken, and SHALL NOT read it again while both are unchanged. WHEN a client sends `POST /api/refresh`, the server SHALL drop every snapshot and every cached answer (projects, milestones, reports) and respond 204, so that the next request reads its sources again.

#### Scenario: Unchanged file
- GIVEN a snapshot taken from a file of 2000 bytes modified at `t1`
- WHEN a client requests the list and the file still has that size and time
- THEN the file is not read again

#### Scenario: Changed file
- GIVEN a snapshot taken from a file modified at `t1`
- WHEN bd writes the file again, it is now modified at `t2`, and a client requests the list
- THEN the file is read again and the list shows the change

#### Scenario: Refresh
- GIVEN a project whose snapshot is current and a report cached less than 60 seconds ago
- WHEN a client sends `POST /api/refresh` and then requests the list and the report
- THEN the response to the refresh is 204, and the file is read again and the report is built again

### REQ-UI-086: Bugs on the bead page
<!-- base: 98affe1662c58bdfca7cdd0fcfbb3eff006d4a31122c91744680a790114fbe45 -->
The bead page and the List detail panel SHALL list under "Bugs found" the `bugs` of the bead (each with id, title and status, linking to that bead in the same project), SHALL show nothing when there are none, and SHALL NOT request or show a reopen count.

#### Scenario: bugs found
- GIVEN a bead with an open bug and a closed bug that each have a `discovered-from` dependency on it
- WHEN the bead page is shown
- THEN "Bugs found" lists both with their id, title and status, each linking to `/beads/<project>/<its id>`

#### Scenario: no bugs
- GIVEN a bead whose `bugs` is empty
- WHEN the bead page is shown
- THEN there is no "Bugs found" section

#### Scenario: no reopens
- GIVEN any bead
- WHEN the bead page is shown
- THEN no request goes to `/reopens` and the page shows no "Reopened" text and no "Reopens unavailable"

### REQ-UI-087: Bugs found in the bug color
<!-- base: d4a2a2d0f411b0088e3481e11b17d42db8a94c92092ad222a7e00aa6f7bca2ae -->
The "Bugs found" heading of REQ-UI-086 SHALL be shown in the bug color (the `type-bug` theme token used by the bug type badge), in light and dark, while the bug rows keep the default text color.

#### Scenario: highlighted heading
- GIVEN a bead with one bug found
- WHEN the bead page is shown
- THEN the "Bugs found" heading uses the `type-bug` color and the bug rows do not

## REMOVED

### REQ-BEADS-011: Bead reopens
<!-- base: cc92e8701349fda7638d647a9bfd73ce9ca4d643d4a2f899a9a9f2f1a26dff7d -->
Reason: it was the console's last `bd` call (`bd history`, about 60 seconds per call on Windows); the user chose to drop the reopen count from the bead page for speed. Reports keep their reopens from gin-workflow `ai_usage.quality`.
