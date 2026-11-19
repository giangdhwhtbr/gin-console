# Beads pull

Epic: gin-console-5ws
Kind: capability
Date: 2026-11-19

## Why

Beads of a project are shared through its Dolt remote: teammates and agents on other machines push, and a checkout sees their beads only after `bd dolt pull`. gin-console never runs `bd` (REQ-BEADS-003). Its "Refresh data" control only drops caches (REQ-BEADS-012), so the console shows remote changes only after someone pulls by hand in each project. The user asked on 2026-11-19 that Refresh pull, and that a setting pull on a schedule, for example every 5 minutes.

Checked on 2026-11-19 with bd 1.0.5 in throwaway databases sharing a file remote:
- With `export.auto: true` and `export.interval: 1s`, a `bd dolt pull` rewrites `.beads/issues.jsonl` itself, so the console needs no `bd export`.
- Diverged histories merge. The same bead edited on both sides fails with "Merge conflict detected" (exit 1), leaves the local database unchanged, and fails the same way on every later pull until someone resolves it.
- No remote fails with "no remote" (exit 1). Three pulls and a write at once all succeed.
- The systemd service reaches GitHub over SSH with `~/.ssh/id_ed25519` and no agent.

## What Changes

- "Refresh data" pulls every project with a Dolt remote, at most four at a time with 30 seconds each, waits for the pulls, then drops the caches as today.
- A new config setting `beads.pull_interval` (for example `5m`) pulls on a schedule in the server. A project entry can set `pull: false` to be left out of both.
- The server keeps the last pull of each project (time, `ok`, `error` or `no_remote`, error text) and returns it as `pull` in `GET /api/projects` and `GET /api/projects/beads`.
- The project card shows "pulled <time> ago", "no Dolt remote" or the pull error. The Beads and My Tasks pages show a note for each project whose last pull failed, with the command to run.
- REQ-BEADS-003 allows exactly `bd dolt pull` from the pull, and nothing else. ADR 0003 records the decision. README and AGENTS.md drop "never runs bd".

## User Stories

### US-1: Refresh brings in what others pushed
As a team member, I want "Refresh data" to pull each project's Beads from its Dolt remote before reloading, so that the console shows beads my teammates and agents pushed without a manual `bd dolt pull`.
REQ: REQ-BEADS-016, REQ-BEADS-012, REQ-BEADS-003

Acceptance criteria:
- After a teammate pushes a new bead, one Refresh shows it on the Beads page.
- A project without a Dolt remote, or with `pull: false`, is not pulled and Refresh still works.
- One failing project does not stop the others, and Refresh still reloads the page.
- Reading pages (lists, beads, reports, projects) still starts no `bd` process.

### US-2: The console keeps itself current
As a team lead who leaves the console open, I want the server to pull on a schedule I set, so that the console stays close to the remote without anyone pressing Refresh.
REQ: REQ-BEADS-017, REQ-CONFIG-006

Acceptance criteria:
- With `beads.pull_interval: 5m`, the server pulls every 5 minutes, measured from the end of the previous run, and the next page load shows the pulled beads.
- Without the setting, the server never pulls on its own.
- An interval under one minute, or one that does not parse, stops startup with a message naming the field.

### US-3: A failed pull is visible
As a team member, I want to see when a project's pull failed and why, so that I can fix a merge conflict or an SSH problem instead of reading stale beads.
REQ: REQ-BEADS-018

Acceptance criteria:
- The project card shows "pulled 2 minutes ago" after a good pull, "no Dolt remote" for a project without one, and the error after a failed pull.
- The Beads page with that project and My Tasks show "Pulling Beads of <project> failed: <error>. Run `bd dolt pull` in <path>." until a later pull succeeds.

## Capabilities Affected

- `beads`: ADDED REQ-BEADS-016, REQ-BEADS-017, REQ-BEADS-018; MODIFIED REQ-BEADS-003, REQ-BEADS-012.
  - Diagrams: `docs/specs/beads/diagrams/beads-pull-activity.md`, `docs/specs/beads/diagrams/scheduled-pull-activity.md`, `docs/specs/beads/diagrams/pull-status-state.md`.
  - Use cases: `docs/specs/beads/use-cases/refresh-pulls-beads.md`, `docs/specs/beads/use-cases/scheduled-beads-pull.md`.
- `config`: ADDED REQ-CONFIG-006.
  - Diagram: `docs/specs/config/diagrams/pull-settings-activity.md`.
- ADR: `docs/adr/0003-console-pulls-beads.md`.
- Assets: none.

## Non-goals

- Pushing, committing, resolving conflicts, or any other `bd` write. The console shows the command instead.
- Running `bd export`: it relies on `export.auto` with `export.interval: 1s`, and the stale note (REQ-BEADS-013) still covers a skipped export.
- An SSH client, keys or an agent socket in the Docker image. Pulls over SSH fail there and show their error.
- Per-project intervals, a pull button separate from Refresh, and pulling from the browser on a timer.
- Changing gin-workflow or bd.

## Success Criteria

- Every scenario of the ADDED and MODIFIED requirements has an automated test that carries its REQ-ID, with a fake `bd`.
- TC-1 passes on the deployed console: Refresh pulls gin-console (remote over SSH) and shows "pulled … ago", gin-harness shows "no Dolt remote", and a 1-minute `pull_interval` moves the pull time without a Refresh.
