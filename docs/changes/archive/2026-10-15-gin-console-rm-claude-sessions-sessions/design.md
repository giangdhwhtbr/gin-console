# Design: Sessions

Epic: gin-console-rm-claude-sessions

## Architecture
- Backend: new `sessions/` context next to `projects/`. `source.py` is the only module that knows Claude's undocumented formats (directory encoding, `.jsonl` records, `~/.claude/sessions/<pid>.json`) and returns the console's own pydantic models (`SessionSummary`, `MessagePage`, `Message`, `Block`). `router.py` exposes `GET /api/sessions` and `GET /api/sessions/{project}/{id}/messages`. The Claude home is `Path.home() / ".claude"`, passed into the router so tests can point it at a temporary directory; no config key.
- Frontend: `features/sessions/` with `SessionsPage`, `SessionLogPage`, `api.ts`. Routing is a small `useRoute` hook over `history.pushState` and `popstate` (the repo has no router and two routes do not justify one); `Layout` gets the Sessions link and `App` picks the page from the path.

## Data Flow
List: map configured projects to directories (REQ-SESSIONS-001) -> `stat` each `*.jsonl` -> read the first and last 64 KiB for title and cwd -> join with live registry records (pid check through `/proc/<pid>`). Log: validate id -> locate file -> iterate lines from `offset`, normalize user and assistant records -> page + `next_offset`. Each page re-reads the file from the start (O(size), fine at MB scale); no index and no state kept between requests.

## Error Handling
Bad id, unknown project or missing transcript: 404. Invalid JSON lines are skipped but counted in offsets. A session whose file cannot be stat'ed is omitted from the list. The UI shows list and log errors with Retry and keeps the last list data on a failed refresh. Transcript text is rendered as plain text only.

## Testing
Backend: temporary Claude home with fabricated transcripts and registry records (mapping and look-alike names, ordering, title fallback, live vs stale pid, resume quoting, paging, record kinds, truncation, broken line, path-like id). Frontend (vitest): routing and back button, list row content and filter, polling like the Projects page, copy and fallback, collapsed details, `<script>` text stays text, load more and refresh, 404 and retry. One real-host check: this project's sessions appear, the current one is live, a log opens.
