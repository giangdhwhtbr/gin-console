# Spec Delta: Project beads

## ADDED

### REQ-SERVER-010: Project beads without workflow
WHEN a client requests `GET /api/projects/beads`, the server SHALL return the configured projects in config order, each with `name`, `path`, `exists` reflecting whether `path` is a directory at request time, and `beads`: for an existing project the summary of REQ-SERVER-006 with `stale` (REQ-BEADS-013), or an object whose only content is an `error` message when its beads cannot be read (REQ-BEADS-005); for a missing project `null`. It SHALL NOT include `workflow` and SHALL NOT start any process.

#### Scenario: Summary per project
- GIVEN an existing project with 3 open, 1 in_progress and 2 ready beads, and a project whose directory does not exist
- WHEN a client requests `GET /api/projects/beads`
- THEN both are returned in config order, the first with `exists: true` and those counts and `stale: false`, the second with `exists: false` and `beads: null`, and neither has `workflow`

#### Scenario: No process
- GIVEN two existing projects with `.beads/issues.jsonl`
- WHEN a client requests `GET /api/projects/beads`
- THEN the response is 200 and no `gin` or `bd` process was started

#### Scenario: Unreadable beads
- GIVEN an existing project without `.beads/issues.jsonl`
- WHEN a client requests `GET /api/projects/beads`
- THEN that project's `beads` is `{"error": "<the REQ-BEADS-005 message>"}` and the other projects have their summaries

#### Scenario: No projects
- GIVEN a config with no projects
- WHEN a client requests `GET /api/projects/beads`
- THEN the response is `[]`

## MODIFIED

### REQ-UI-023: Project choice
<!-- base: 68283ce96fed402665e094766822b1c6902b057b29cbec47bd63eedf0c181156 -->
The bead list SHALL offer the configured projects whose directory exists, from `GET /api/projects/beads`, in a select kept in the `?project=` query, SHALL default to the first of them, and WHEN no project exists SHALL say that no projects are configured.

#### Scenario: Default and choice
- GIVEN two projects
- WHEN the list opens without `?project=`
- THEN the first project is selected and its beads are shown, and choosing the other changes the URL and the list

#### Scenario: No projects
- GIVEN `/api/projects/beads` returns an empty list
- WHEN the list opens
- THEN it says no projects are configured

#### Scenario: Not the full projects list
- GIVEN two projects
- WHEN the list opens
- THEN no request goes to `/api/projects`

### REQ-UI-100: My Tasks list
<!-- base: 5eb7f5607ee12fc10ef70c28f662c4f0cf4be460629dd7ffcbf1f147e727cde1 -->
WHEN the My Tasks page opens, the frontend SHALL request `GET /api/projects/beads`, then `GET /api/beads?project=<name>` for each project whose directory exists, and SHALL list in one table the beads whose `assignee`, trimmed and ignoring case, equals the signed-in email or the part of the email before `@`, leaving out beads matched only by `owner`. Each row SHALL show the project, the id, the title, the state, the type, `P<n>` and the updated time, and SHALL link to `/beads/<project>/<id>`. Rows SHALL be ordered by priority ascending, then by `updated_at` newest first, then by project and id. The page SHALL show how many beads it lists, and WHEN none matches, SHALL say "No tasks assigned to <email>". The Refresh control (REQ-UI-096) SHALL load the list again.

#### Scenario: Match by email or name
- GIVEN the signed-in email `giangdhwhtbr@gmail.com`, project A with open beads assigned to `giangdhwhtbr`, `GiangDHWHTBR@gmail.com` and `alice`, and one unassigned open bead owned by `giangdhwhtbr@gmail.com`
- WHEN My Tasks opens
- THEN only the beads assigned to `giangdhwhtbr` and `GiangDHWHTBR@gmail.com` are listed, and the count is 2

#### Scenario: Across projects in order
- GIVEN project A has a P2 bead assigned to me updated today and project B has a P1 bead assigned to me updated last week
- WHEN My Tasks opens
- THEN the B bead is first, each row shows its project, and clicking the A bead opens `/beads/A/<id>`

#### Scenario: Nothing assigned
- GIVEN no bead in any project is assigned to `giangdhwhtbr@gmail.com` or `giangdhwhtbr`
- WHEN My Tasks opens
- THEN the page says "No tasks assigned to giangdhwhtbr@gmail.com"

#### Scenario: Missing project directory
- GIVEN project C is configured but its directory does not exist
- WHEN My Tasks opens
- THEN no beads request is sent for C

#### Scenario: Not the full projects list
- GIVEN two projects
- WHEN My Tasks opens
- THEN no request goes to `/api/projects`

### REQ-UI-102: My Tasks failures
<!-- base: fb90d826eae75c8a3660253051f422dacbe0c80b91f712cd43b84fda0a482135 -->
IF `GET /api/projects/beads` fails, THEN the My Tasks page SHALL show that the projects could not be loaded; IF the beads request of a project fails, THEN the page SHALL show an error naming that project and its message and SHALL still list the matching beads of the other projects; WHILE requests are pending, the page SHALL say it is loading.

#### Scenario: One project fails
- GIVEN projects A and B, where the beads request of B responds 500 and A has 2 beads assigned to me
- WHEN My Tasks opens
- THEN an error names B and the 2 beads of A are listed

#### Scenario: Projects fail
- GIVEN `GET /api/projects/beads` responds 500
- WHEN My Tasks opens
- THEN the page says the projects could not be loaded and lists nothing

### REQ-UI-103: Stale beads note
<!-- base: 1b47034e690ad531189eba9fefc5d210553fab27420057b7675587ee0294bc06 -->
WHERE the `beads` object of a project in `GET /api/projects/beads` has `stale: true`, the Beads page with that project selected and the My Tasks page SHALL show, above their list, the note "Beads of <project> may be out of date. Run `bd export -o .beads/issues.jsonl` in <project>." once per stale project, and SHALL show no note for a project whose `stale` is `false` or missing.

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

### REQ-BEADS-013: Stale export
<!-- base: 083a7f3b909c676e73be88bd2f35b71765cc7745bf6c67f9a0b096bce9005889 -->
The server SHALL record, each time it reads a project's `.beads/issues.jsonl`, the content of the project's embedded Dolt manifests (`.beads/embeddeddolt/*/.dolt/noms/manifest`), and SHALL report the project's export as stale WHILE that content differs from the recorded content and the file has not changed since; WHERE a project has no such manifest, its export SHALL never be stale. `GET /api/projects` and `GET /api/projects/beads` SHALL include `stale` (a boolean) in the `beads` object of each project whose beads were read.

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

#### Scenario: Project beads without reuse
- GIVEN the file was read when the manifest held `root-1`
- WHEN a bead is written, the manifest now holds `root-2`, the file is unchanged, and a client requests `GET /api/projects/beads` at once
- THEN that project's `beads.stale` is `true`

## REMOVED
