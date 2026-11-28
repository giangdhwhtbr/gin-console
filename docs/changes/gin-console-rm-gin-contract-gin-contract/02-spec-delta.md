# Spec Delta: Contract check for the gin CLI

## ADDED

### REQ-CONFIG-010: Path of the gin executable
The config SHALL accept an optional top-level `gin` section whose `path` is an absolute path to the `gin` executable; WHEN `gin.path` is set, every `gin` call of the console SHALL run that file, and WHEN it is not set, `gin` SHALL be found as before (on `PATH`, through the `gin.cmd` shim or Git Bash on Windows). IF `gin` cannot be found or run, THEN the error the console shows SHALL name `gin.path` and the config file. IF `gin.path` is not absolute, THEN the console SHALL exit with a non-zero status and a message naming `gin.path` (REQ-CONFIG-003).

#### Scenario: Default
- GIVEN a config without `gin`
- WHEN the console runs `gin`
- THEN it runs the `gin` found on `PATH`

#### Scenario: Set
- GIVEN `gin: {path: /opt/gin/gin}`
- WHEN the console runs `gin state`
- THEN the process started is `/opt/gin/gin`

#### Scenario: Not found
- GIVEN no `gin` on `PATH` and no `gin.path`
- WHEN a page asks for a project's milestones
- THEN the error names `gin.path`

#### Scenario: Relative path
- GIVEN `gin: {path: bin/gin}`
- WHEN the console starts
- THEN it exits non-zero and the message names `gin.path`

### REQ-SERVER-013: Contract check
Type: non-functional
Category: compatibility
WHEN the operator runs `python -m gin_console check-contract [--project NAME] [--epic ID]... [--milestone ID]`, the console SHALL run, in the chosen project (default: the first configured one), `gin state --workflow-id <epic> --format json` for each chosen epic, `gin milestone list --all --json`, `gin milestone show <milestone> --json`, `gin specs trace --all --format json` and `gin specs reqs --format json`, exactly as the server runs them, and SHALL parse each output with the console's own parsing. Without `--epic`, it SHALL choose the newest epic of each kind (capability, technical, parity) present in the project's Beads and report each missing kind as `not covered`. Without `--milestone`, it SHALL choose the first milestone of the list. For each call it SHALL print `ok`, or each key path that is missing or has another type than the console expects; it SHALL print as a note each key, inside an object the console reads, that the console does not read. It SHALL exit 0 when no call failed, 1 when a call failed or printed a missing or retyped key, and 2 for a wrong argument or an unknown project.

#### Scenario: Current gin
- GIVEN the installed `gin` matches the console
- WHEN the operator runs `check-contract --project gin-console`
- THEN each call prints `ok` and the exit status is 0

#### Scenario: Missing key
- GIVEN a `gin milestone list` output whose first milestone has no `id`
- WHEN the check parses it
- THEN it prints `missing: milestones[0].id` and exits 1

#### Scenario: Changed type
- GIVEN a `gin state` output whose `stage` is a number
- WHEN the check parses it
- THEN it prints a type error naming `stage` and exits 1

#### Scenario: New key
- GIVEN a `gin specs trace` output with an extra key in a requirement
- WHEN the check parses it
- THEN it prints that key as a note and still exits 0

#### Scenario: Kind not covered
- GIVEN a project with capability epics only
- WHEN the check chooses its epics
- THEN it reports `technical` and `parity` as not covered and exits 0

#### Scenario: Unknown project
- GIVEN no configured project `ghost`
- WHEN the operator runs `check-contract --project ghost`
- THEN it exits 2 naming `ghost`

### REQ-SERVER-014: Environment of gin calls
Every `gin` call of the console SHALL run without `CLAUDE_CODE_SESSION_ID` in its environment, in addition to the variables already removed, and with the rest of the console's environment unchanged.

#### Scenario: Session id removed
- GIVEN the console runs with `CLAUDE_CODE_SESSION_ID=abc` in its environment
- WHEN it runs `gin state`
- THEN the child process has no `CLAUDE_CODE_SESSION_ID`

## MODIFIED

## REMOVED
