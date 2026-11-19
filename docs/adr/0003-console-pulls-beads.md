# The console pulls Beads from Dolt remotes

Date: 2026-11-19
Status: proposed

## Context
ADR 0001 describes gin-console as read-only, and REQ-BEADS-003 forbids any `bd` command: the console reads `.beads/issues.jsonl` that bd exports. Beads written on other machines reach a checkout only through `bd dolt pull`, so the console showed remote work only after someone pulled by hand in each project. The user asked on 2026-11-19 that "Refresh data" pull and that a setting pull on a schedule (epic gin-console-5ws).

## Decision
The server runs exactly one bd command, `bd dolt pull`, in a configured project's directory: when a client sends `POST /api/refresh`, and on the interval `beads.pull_interval` when it is set. A project can opt out with `pull: false`. The console still never creates, edits, closes or deletes a bead, never pushes or commits, never resolves a merge conflict, and never runs `bd export`; reading pages still start no process. A failed pull is shown with the command to run by hand. A separate systemd timer was rejected because Refresh would still show stale beads and the console could not show why a pull failed.

## Consequences
The console now writes to a project's Dolt database through bd, so a pull can merge remote history into a checkout someone is working in; bd merges diverged histories and refuses conflicting edits without changing local data. The service needs credentials for the remotes (an SSH key without a passphrase for `git+ssh`), which the Docker image does not provide. Tests inject the bd runner, so no test starts bd.
