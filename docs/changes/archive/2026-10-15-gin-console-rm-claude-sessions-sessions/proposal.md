# Sessions

Epic: gin-console-rm-claude-sessions
Date: 2026-10-14

## Why
The console shows project state but not the Claude sessions behind it. The goal is to list the Claude sessions of every configured project, read their logs read-only, and jump back to the native tool to continue.

## What Changes
- A new backend context `sessions/` reads `~/.claude/projects` and `~/.claude/sessions` and serves a session list and paginated messages.
- A Sessions page (list with a project filter and live badges) and a session log page (collapsed tool calls, load more) with history-API routing and no new dependency.

## User Stories
### US-1: Browse the sessions of my projects
As the console owner, I want every Claude session of every configured project, including worktree sessions, in one list, so that I find the conversation I need.
REQ: REQ-SESSIONS-001, REQ-SESSIONS-002, REQ-SESSIONS-003, REQ-UI-008, REQ-UI-009, REQ-UI-010

Acceptance criteria:
- Sessions of the project directory and its `.planning/worktrees/*` directories appear, filtered by project, with live ones first.
- The list refreshes itself and survives a failed refresh.

### US-2: See which sessions are running
As the console owner, I want live sessions marked with their status, so that I know where an agent is working right now.
REQ: REQ-SESSIONS-004, REQ-UI-009

Acceptance criteria:
- A session whose process is running shows a "live" badge with status and kind; a stale registry record does not.

### US-3: Continue in the native tool
As the console owner, I want to copy the exact command to resume a session, so that I can continue it in my terminal.
REQ: REQ-SESSIONS-005, REQ-UI-011

Acceptance criteria:
- "Copy resume" puts `cd <cwd> && claude --resume <id>` on the clipboard, or shows it for manual copy.

### US-4: Read a conversation log
As the console owner, I want to read a session's messages with tool calls collapsed, so that I can review what happened without the noise.
REQ: REQ-SESSIONS-006, REQ-SESSIONS-007, REQ-UI-012, REQ-UI-013

Acceptance criteria:
- Messages load 100 at a time, tool calls and thinking are collapsed, long outputs are cut and marked, and transcript text is never interpreted as HTML.

### US-5: Safe and understandable failures
As the console owner, I want unknown or broken sessions to fail clearly and never expose other files, so that the console stays safe and readable.
REQ: REQ-SESSIONS-008, REQ-UI-014

Acceptance criteria:
- Bad ids, unknown projects and missing transcripts give 404 and a "Session not found" page; nothing outside the project directories is read or written.

## Capabilities Affected
- `sessions` (new): ADDED REQ-SESSIONS-001..008.
- `ui`: ADDED REQ-UI-008..014; REQ-UI-001..007 unchanged.

## Non-goals
Web chat, writing or deleting sessions, search inside logs, Codex and Antigravity sessions, Remote Control links, a message count or cache index.

## Success Criteria
All scenarios have tests; on the live host the Sessions page lists this project's sessions (including the current live one), opens a log, and copies a working resume command.
