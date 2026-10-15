# Sessions

## Purpose

## Requirements

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
