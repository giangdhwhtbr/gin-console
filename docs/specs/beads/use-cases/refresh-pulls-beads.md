# Refresh pulls Beads

Actor: Team member
Secondary actors: Dolt remote
Trigger: The team member activates "Refresh data".
Requirements: REQ-BEADS-016, REQ-BEADS-012, REQ-BEADS-003, REQ-BEADS-018

## Goal

See the beads that teammates and agents pushed to each project's Dolt remote, without running `bd dolt pull` by hand.

## Preconditions

- The projects keep their Beads with `export.auto: true` and `export.interval: 1s`.
- The service can reach each remote (an SSH key without a passphrase for `git+ssh` remotes).

## Main flow
1. The team member activates "Refresh data".
2. The system runs `bd dolt pull` in each project that exists and does not set `pull: false`, at most four at a time.
3. Each pull ends and bd rewrites the project's `.beads/issues.jsonl`.
4. The system keeps each project's pull result, drops its caches and answers.
5. The page loads its data again and shows the pulled beads, and each project card shows "pulled <time> ago".

## Alternative flows
### 2a. A pull of the project is already running (scheduled)
1. The system waits for it and takes its result.
2. Resume at step 4.

### 3a. The project has no Dolt remote
1. The system keeps `no_remote`; the card shows "no Dolt remote".
2. Resume at step 4.

## Exception flows
### 3e. The pull fails (merge conflict, remote unreachable, timeout)
1. The system keeps `error` with the error line and goes on with the other projects.
2. After the reload, the card shows "pull failed: <error>" and the Beads and My Tasks pages show the note with `bd dolt pull` and the project's path.
3. Use case ends.

## Business rules

- REQ-BEADS-003: the only `bd` command is `bd dolt pull`; reading pages start no process.
- REQ-BEADS-012: Refresh answers 204 even when a pull failed.

## Postconditions

- Each pulled project's last pull result is kept until its next pull or a server restart.
