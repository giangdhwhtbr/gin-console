# Team reports

Epic: gin-console-ce5
Date: 2026-11-01

## Why
A team running gin-workflow cannot see how it works: who spends how many tokens, which lifecycle stage eats the budget, how fast beads move, and where work comes back. The data already exists. gin-workflow writes `metadata.ai_usage` (tokens and cost per model, role and stage, plus quality counts) into each bead when it closes or its epic ships, and every bead carries `assignee`, `created_at`, `started_at` and `closed_at`. On gin-console, 89 of 104 beads hold `ai_usage`; epic `gin-console-38i` spent about 32 M tokens in `discuss` against 2.5 M in `execute`, which nobody saw. The Sessions page, in its current form, is not useful (user, 2026-11-01) and is hidden from navigation until the web-chat epic redesigns it.

## What Changes
1. **Reports API**: `GET /api/reports?project=<name|all>&days=7|30|90&sprint=<name>` reads `bd list --all` once per project and returns four sections: AI usage, delivery flow, quality and rework, data coverage. `project=all` merges every configured project and groups members by `assignee`.
2. **No double counting**: an epic's `ai_usage` already includes its children (gin-workflow `usage.py`, `members = {bead, *children}`). Each bead contributes only its own part (an epic's total minus its children's), dated by its `closed_at`.
3. **Reports page** at `/reports`: filters in the URL, KPI row, Recharts charts and tables per section, loaded lazily so other pages do not grow.
4. **Sessions hidden**: the "Main" navigation drops Sessions and gains Reports; `/sessions` pages and the sessions API stay reachable by URL.

## User Stories

### US-1: See token usage per member
As a team lead, I want tokens and cost per member, stage and model for a period, so that I can see where the AI budget goes.
REQ: REQ-REPORTS-001, REQ-REPORTS-002, REQ-REPORTS-003, REQ-UI-088, REQ-UI-089

Acceptance criteria:
- Choosing a project and 30 days shows each assignee with closed beads, tokens, cost, tokens per bead and cache ratio; beads without an assignee show as "Unassigned".
- An epic and its closed children counted together give the same total as `gin-workflow usage report` for the same beads.
- Stage shares and the model by role table show the same period.

### US-2: Compare usage across projects
As a team lead, I want an "All projects" view, so that I can see a member's total across the repos they work in.
REQ: REQ-REPORTS-001, REQ-REPORTS-007, REQ-UI-088

Acceptance criteria:
- With "All projects", a member who closed beads in two projects shows one row with the sum.
- A project whose `bd` fails is listed as failed and the other projects still show.

### US-3: See delivery flow
As a team lead, I want throughput, cycle time, work in progress and estimate accuracy, so that I can see how fast work moves and where it stalls.
REQ: REQ-REPORTS-004, REQ-UI-090

Acceptance criteria:
- Beads closed per ISO week are shown by type.
- Median and p85 cycle time and lead time are shown per type and per member.
- The in-progress count per member and the 5 oldest in-progress beads are shown.
- Closed epics with an estimate show estimated against actual working days.

### US-4: See rework next to cost
As a team lead, I want reopens, bugs, review cycles, rejections, findings and waivers next to tokens, so that I can spot work that was expensive and still came back.
REQ: REQ-REPORTS-005, REQ-UI-091

Acceptance criteria:
- A table per member and per epic shows each quality count and the rework rate.
- A scatter plot places each closed non-epic bead by tokens and rework; clicking a point opens its bead page.

### US-5: Trust the numbers
As a team lead, I want to see what the report is missing, so that I do not read gaps as facts.
REQ: REQ-REPORTS-006, REQ-UI-092

Acceptance criteria:
- Closed beads without `ai_usage` are listed with a copyable `gin-workflow usage collect --bead <id>` command.
- Unpriced models, the unassigned token share, log sources that were not `ok`, skipped log lines and unreadable `ai_usage` are shown.
- A fixed note says the numbers are estimates from local Claude Code and Codex logs and that Antigravity and OpenCode are not measured.

### US-6: Hide Sessions until it is redesigned
As a console user, I want Sessions out of the navigation and Reports in it, so that the navigation shows pages worth opening.
REQ: REQ-UI-008, REQ-UI-055, REQ-UI-057

Acceptance criteria:
- The "Main" navigation holds Projects, Beads, Milestones, Reports and Quota.
- `/sessions` and `/sessions/<project>/<id>` still render, with no navigation link marked current.

## Capabilities Affected
- `reports` (new): REQ-REPORTS-001 to REQ-REPORTS-007 added.
- `ui`: REQ-UI-088 to REQ-UI-093 added; REQ-UI-008, REQ-UI-055 and REQ-UI-057 modified.

## Non-goals
- Any write: the console never runs `gin-workflow usage collect`, never edits prices or beads.
- Recomputing cost from a price table in the console: cost is the one written at collection.
- Antigravity and OpenCode usage.
- Team-mode area filters, custom date ranges, CSV export, stored history.
- Redesigning or removing the Sessions page and API (left to the web-chat epic).
- Computing reopens or bugs with `bd history` (REQ-BEADS-011 does that per bead page; here only `ai_usage.quality` counts).

## Success Criteria
- On gin-console with 30 days, `gin-console-38i` appears in the epic list with its `discuss` tokens dominating its stage share, and the token total over its tree equals the `totals` of `gin-workflow usage report --epic gin-console-38i --format json`.
- pytest and vitest cases carry every REQ-ID above; the frontend build passes and the Reports chunk is separate from the main chunk.
- A browser check on the Tailscale deployment (05-tests.md) passes.
