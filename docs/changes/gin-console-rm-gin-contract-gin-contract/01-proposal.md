# Contract check for the gin CLI

Epic: gin-console-rm-gin-contract
Kind: technical
Points: 3 (one check command over five `gin` calls, one config key, one environment filter, Docker defaults; same size as gin-console-rm-retire-sessions-quota = 3)
Date: 2026-11-28

## Why

gin-console reads the JSON of the installed `gin` CLI from gin-workflow. A gin-workflow release that changes that JSON reaches the console only after `install.sh` runs again, and today it shows up first as a page that fails. The operator needs to know on the day of the install.

Two smaller gaps sit on the same path:
- `gin` is found only on `PATH`, and nothing names a fix when it is missing.
- `gin` runs with the console's whole environment, including `CLAUDE_CODE_SESSION_ID`. The gin-workflow spec of gin-workflow-cost-binding leaves its removal to the console.

The Docker defaults disagree and are stale: `docker-compose.yml` uses `v1.4.2` and `Dockerfile` uses `v3.0.0`, while this host runs `gin 3.5.4`.

User decisions 2026-11-28:
- **Ids:** the check picks its epics and milestone from the project itself. It takes the newest epic of each kind present (capability, technical, parity) and the first milestone of `gin milestone list`. A kind with no epic is reported as not covered, not as a failure. `--epic` and `--milestone` override the choice.
- **New keys:** the check fails only on a missing key or a changed type. A key the console does not read yet is printed as a note.

Assumptions (defaults taken without a question):
- The check covers the five `gin` calls of the epic: `gin state`, `gin milestone list`, `gin milestone show`, `gin specs trace` and `gin specs reqs`. `gin-qa` is out of scope.
- New keys are compared only inside objects the console models. For `gin state` that means the parts `EpicWorkflow` reads, so its many unread top-level keys are not listed.
- `gin.path` is optional. Without it, `gin` is found on `PATH`, with the Windows shim, as today.
- Both Docker defaults become `v3.5.4`.

## What Changes

- **Server:**
  - Add `python -m gin_console check-contract [--project NAME] [--epic ID]... [--milestone ID]`.
  - Move the parsing of `gin state` into its own function, so the check and the gate panel share it.
  - `CLAUDE_CODE_SESSION_ID` is removed from the environment of every `gin` call.
- **Config:** add an optional `gin.path`.
- **Docker:** both `GIN_WORKFLOW_REF` defaults become `v3.5.4`.
- **Docs:** add README sections on the check and on `gin.path`, and update `config.example.yaml`.

## Capabilities Affected

- `config`: REQ-CONFIG-010.
- `server`: REQ-SERVER-013, REQ-SERVER-014.
- `docker`: no REQ change. REQ-DOCKER-006 still holds, and the compose default now equals the Dockerfile default.

## Non-goals

- Running the check in the unit tests, which inject external commands.
- Running the check on a schedule or in CI.
- Any change to gin-workflow, or to `gin-qa`.
- Any page change.

## Success Criteria

- `check-contract` against this host's gin-console project prints `ok` for each of the five calls and exits 0.
- Fed an output with a missing or retyped key, it names the key path and exits 1.
- With `gin` missing, the server and the check name `gin.path` in the error.
- No `gin` child process sees `CLAUDE_CODE_SESSION_ID`.
