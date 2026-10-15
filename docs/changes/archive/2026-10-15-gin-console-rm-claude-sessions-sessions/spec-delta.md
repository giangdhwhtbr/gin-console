# Spec Delta: Sessions

<!-- One block per requirement: "### REQ-<CAP>-<NNN>: <title>", one SHALL/MUST statement,
     and at least one "#### Scenario:" with "- GIVEN", "- WHEN", "- THEN" bullets.
     Get new IDs from `gin-workflow specs next-id <cap>`.
     MODIFIED and REMOVED blocks put an HTML comment "base: <hash>" on the line after the heading,
     the living block hash from `gin-workflow specs hash <REQ-ID>`; REMOVED blocks add "Reason: <why>".
     Preferred sentence patterns (EARS): "WHEN <trigger>, the <system> SHALL <response>",
     "WHILE <state>, ...", "IF <unwanted condition>, THEN ...", "WHERE <feature>, ...". -->

## ADDED

### REQ-SESSIONS-001: Project session directories
The server SHALL treat a directory under `~/.claude/projects` as belonging to a configured project when its name equals the project `path` encoded (every `/` and `.` replaced by `-`) or equals that encoded path followed by `--planning-worktrees-` and a suffix, and SHALL ignore every other directory.

#### Scenario: Main and worktree directories
- GIVEN a project at `/home/gin/qwikfone` and directories `-home-gin-qwikfone` and `-home-gin-qwikfone--planning-worktrees-qwikfone-cp1g`
- WHEN sessions are listed for that project
- THEN sessions from both directories are included

#### Scenario: Similar names do not match
- GIVEN projects at `/home/gin/gin` and `/home/gin/gin-console` and a directory `-home-gin-gin-console`
- WHEN sessions are listed for the project at `/home/gin/gin`
- THEN no session from `-home-gin-gin-console` is included

### REQ-SESSIONS-002: Session list
WHEN a client requests `GET /api/sessions` with an optional `project` name, the server SHALL return one entry per `<sessionId>.jsonl` file of the matching projects, each with `id`, `project`, `title`, `cwd`, `modified` (file mtime, ISO 8601), `size` (bytes), `live` and `resume_command`, ordered with live sessions first and then by `modified` descending, and IF `project` names no configured project, THEN the server SHALL respond 404.

#### Scenario: All projects
- GIVEN two projects with one session each
- WHEN a client requests `GET /api/sessions`
- THEN both sessions are returned with their project names

#### Scenario: Filter and order
- GIVEN a project with an older session, a newer session and a live older session
- WHEN a client requests `GET /api/sessions?project=<name>`
- THEN the live session is first, then the newer one, then the older one

#### Scenario: Unknown project
- GIVEN no project named `nope`
- WHEN a client requests `GET /api/sessions?project=nope`
- THEN the response is 404

### REQ-SESSIONS-003: Session title and cwd
The server SHALL set a session's `title` to the last `ai-title` record of its transcript, otherwise to the first 80 characters of the first user text, otherwise to its id, and SHALL set `cwd` to the `cwd` of the first record that has one, reading only the first and last 64 KiB of the file.

#### Scenario: AI title
- GIVEN a transcript with two `ai-title` records
- WHEN the session is listed
- THEN its title is the later one

#### Scenario: No AI title
- GIVEN a transcript without `ai-title` whose first user text is "fix the bug"
- WHEN the session is listed
- THEN its title is "fix the bug"

### REQ-SESSIONS-004: Live sessions
The server SHALL mark a session `live` when a `~/.claude/sessions/<pid>.json` record names its id and that `pid` is a running process, and SHALL then add the record's `name`, `status` and `kind` to the entry; a record whose process is not running SHALL be ignored.

#### Scenario: Running session
- GIVEN a registry record for the session whose pid is running
- WHEN sessions are listed
- THEN the entry has `live` true with the record's name, status and kind

#### Scenario: Stale record
- GIVEN a registry record whose pid is not running
- WHEN sessions are listed
- THEN the entry has `live` false

### REQ-SESSIONS-005: Resume command
The server SHALL give each session a `resume_command` of the form `cd <cwd> && claude --resume <id>` with `<cwd>` shell-quoted, and IF the cwd is unknown, THEN the command SHALL be `claude --resume <id>`.

#### Scenario: Command with cwd
- GIVEN a session with id `abc` and cwd `/home/gin/my project`
- WHEN it is listed
- THEN `resume_command` is `cd '/home/gin/my project' && claude --resume abc`

### REQ-SESSIONS-006: Message pages
WHEN a client requests `GET /api/sessions/{project}/{id}/messages` with `offset` (default 0) and `limit` (default 100, 1 to 500), the server SHALL read the transcript from line `offset` and return the items of at most `limit` user or assistant records in file order together with `next_offset`, the line after the last one consumed, or `null` at the end of the file.

#### Scenario: First page
- GIVEN a transcript with 250 user or assistant records
- WHEN a client requests the messages with the default limit
- THEN 100 items are returned and `next_offset` points after the 100th

#### Scenario: Last page
- GIVEN the same transcript and the `next_offset` returned by the second page
- WHEN a client requests the messages from that offset
- THEN 50 items are returned and `next_offset` is `null`

#### Scenario: Other record types
- GIVEN a transcript with `mode`, `attachment` and `ai-title` lines between messages
- WHEN a client requests the messages
- THEN only user and assistant records are returned as items

### REQ-SESSIONS-007: Message shape
The server SHALL return each item as `role` and an ordered `blocks` list whose entries are `text`, `thinking`, `tool_use` (`name`, `input` as compact JSON text) or `tool_result` (`text` from its text parts), SHALL cut any block text longer than 20 000 characters and mark that block `truncated`, and SHALL skip lines that are not valid JSON without failing the page.

#### Scenario: Block kinds
- GIVEN an assistant record with thinking, text and tool_use blocks and a user record with a tool_result
- WHEN a client requests the messages
- THEN each item has its blocks in order with the matching types

#### Scenario: Long output
- GIVEN a tool_result with 50 000 characters
- WHEN a client requests the messages
- THEN its text has 20 000 characters and `truncated` is true

#### Scenario: Broken line
- GIVEN a transcript with one line that is not JSON
- WHEN a client requests the messages
- THEN the other items are returned and the offset still counts the broken line

### REQ-SESSIONS-008: Safe, read-only lookup
The server SHALL accept a session `id` only in UUID form, SHALL locate the transcript only inside the directories of REQ-SESSIONS-001, SHALL respond 404 for an unknown project, an id that is not a UUID, or a missing transcript, and SHALL never write to or delete any Claude file.

#### Scenario: Path-like id
- GIVEN a request for the messages of the id `../../etc/passwd`
- WHEN the server handles it
- THEN the response is 404 and no file outside the project directories is read

#### Scenario: Missing transcript
- GIVEN a well-formed id that has no transcript
- WHEN a client requests its messages
- THEN the response is 404

### REQ-UI-008: Sessions navigation
The sidebar SHALL contain a "Sessions" link, and the frontend SHALL show the Projects page at `/`, the session list at `/sessions` and the session log at `/sessions/<project>/<id>`, changing page without a full reload and following the browser back and forward buttons.

#### Scenario: Open the list
- GIVEN the Projects page is shown
- WHEN the user clicks "Sessions"
- THEN the URL is `/sessions` and the session list is shown without a reload

#### Scenario: Back button
- GIVEN the user opened a session log from the list
- WHEN the user presses back
- THEN the session list is shown

### REQ-UI-009: Session list display
The session list SHALL show for each session its title, project, cwd, last-modified time, size and a "live" badge with the status and kind when live, SHALL offer a project filter kept in the `?project=` query, and WHEN the list is empty SHALL say that no sessions were found.

#### Scenario: Row content
- GIVEN a live session and an ended session
- WHEN the list loads
- THEN both rows show title, project and cwd, and only the live one shows the "live" badge with its status

#### Scenario: Filter
- GIVEN sessions of two projects
- WHEN the user selects one project
- THEN only its sessions are shown and the URL contains `?project=<name>`

### REQ-UI-010: Session list refresh
WHILE the page is visible, the session list SHALL reload every 10 seconds without replacing the list by a loading state, WHILE the page is hidden it SHALL not poll and SHALL reload when it becomes visible, and IF a refresh fails, THEN it SHALL keep the last data and show the error with a retry button.

#### Scenario: Silent refresh
- GIVEN the list is shown and 10 seconds pass
- WHEN the list reloads
- THEN the list stays on screen and shows the new values

#### Scenario: Refresh failure
- GIVEN the list is shown and the next refresh fails
- WHEN the failure is received
- THEN the old list stays visible with an error message and a retry button

### REQ-UI-011: Copy resume command
WHEN the user clicks "Copy resume" on a session, the frontend SHALL copy its `resume_command` to the clipboard and show "Copied", and IF the clipboard is unavailable or refuses, THEN it SHALL show the command in a selectable field.

#### Scenario: Copy
- GIVEN the clipboard is available
- WHEN the user clicks "Copy resume"
- THEN the command is written to the clipboard and "Copied" is shown

#### Scenario: Clipboard refused
- GIVEN the clipboard write is rejected
- WHEN the user clicks "Copy resume"
- THEN the command is shown in a selectable field

### REQ-UI-012: Session log view
The session log page SHALL show the session title, cwd and a copy-resume button, and the messages in order with their role, where `text` blocks are plain text with line breaks and `thinking`, `tool_use` and `tool_result` blocks are collapsed `<details>` elements that show the tool name or kind on their summary line, and a block marked `truncated` SHALL say so.

#### Scenario: Collapsed tool call
- GIVEN an assistant message with a text block and a tool_use block
- WHEN the log loads
- THEN the text is visible and the tool_use is a closed details element naming the tool

#### Scenario: Text is not interpreted
- GIVEN a message whose text contains `<script>` and Markdown
- WHEN the log loads
- THEN the characters are shown as typed and no element is created from them

### REQ-UI-013: Load more and refresh
WHEN the server returns a non-null `next_offset`, the log page SHALL show a "Load more" button that appends the next page, and WHEN the session is live the page SHALL show a "Refresh" button that appends the records written after the last offset read.

#### Scenario: Load more
- GIVEN the first page returned a `next_offset`
- WHEN the user clicks "Load more"
- THEN the next page is appended and the button disappears when `next_offset` is null

#### Scenario: Refresh a live session
- GIVEN a live session whose transcript grew
- WHEN the user clicks "Refresh"
- THEN the new messages are appended

### REQ-UI-014: Session errors
IF the session list or a log page request fails, THEN the page SHALL show an error and a retry button that repeats the request, and IF the server answers 404 for a log, THEN the page SHALL say "Session not found" with a link back to the list.

#### Scenario: List error
- GIVEN the first list request fails and the second succeeds
- WHEN the user clicks retry
- THEN the error disappears and the list is shown

#### Scenario: Unknown session
- GIVEN the server answers 404 for a session
- WHEN the log page loads
- THEN it says "Session not found" and links back to the list

## MODIFIED

## REMOVED
