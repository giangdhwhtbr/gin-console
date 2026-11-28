# Contract check for the gin CLI

**Context**
Epic gin-console-rm-gin-contract (2026-11-28). gin-console reads the JSON of the installed `gin` (gin-workflow), and a release that changes it showed up only as a failing page. The epic added a check the operator runs after each install, an optional `gin.path`, and a cleaner environment for `gin`.

**Decision/Solution**
- `python -m gin_console check-contract [--project] [--epic]... [--milestone]` (`projects/contract.py`) runs the five calls the server runs, through `run_json` and `_child_env`, with the same timeouts:
  - `gin state` uses `GATE_TIMEOUT`.
  - The milestone calls use `GW_TIMEOUT`.
  - The specs calls use `GIN_TIMEOUT`.
- It parses each output with the console's own functions. `parse_epic_workflow` was split out of `collect_epic_workflow` for this.
- The source parsers wrap a pydantic `ValidationError` into a generic message, so the check validates the model again on the raw JSON to name the key path.
- Exit status:
  - 0 when nothing failed;
  - 1 for a missing or retyped key, or a call that failed;
  - 2 when the check could not start (bad argument, unknown project, config that does not load).
- `new: <path>` notes list keys the console does not read and never fail the check. For `gin state` only the parts `EpicWorkflow` reads are compared (`new_keys(root=False)`).
- Ids are chosen from the project: the newest epic of each kind (`beads/kinds.py` `kind_of`) and the first milestone. A kind with no epic prints `not covered`.
- `gin.path` (`GinSettings`, `projects/collect.py` `configure_gin`) is module state set once at startup.
  - Without it, `gin` is found on `PATH`, through the Windows shim.
  - When `gin` cannot be started, the error ends with `set gin.path in <config file>` (not found) or `(check gin.path in <config file>)` (other `OSError`).
- `_child_env` drops `CLAUDE_CODE_SESSION_ID` as well as `VIRTUAL_ENV`.
- Docker: `Dockerfile`, `docker-compose.yml` and `.env.example` all default `GIN_WORKFLOW_REF` to `v3.5.4`. `.env.example` wins in the documented flow (`cp .env.example .env`), so all three must move together.

**Consequences**
- A healthy host still prints `new:` notes. With gin 3.5.4, `gin specs reqs` has 13 unread paths and `gin specs trace` has 4.
- `tests/fakes.py` `Fake` answers only `gin state` calls, so tests of other commands use their own fake (`tests/test_contract.py`).
- `projects/contract.py` imports `GATE_TIMEOUT` from `qa/router.py`. The review suggested moving the constant to `projects/collect.py`; that is not done.

**References**
- Code: `backend/src/gin_console/projects/{contract.py,collect.py}`, `backend/src/gin_console/config.py`, `backend/src/gin_console/__main__.py`.
- Change: `docs/changes/archive/2026-11-28-gin-console-rm-gin-contract-gin-contract/`.
- Beads: gin-console-rm-gin-contract (tracks .1, .2).
- Related: [optional-auth](optional-auth.md), which uses the same `__main__` subcommand pattern (`user`).

**Scope**
Any change to how the console runs `gin`, to the JSON it reads from it, or to the gin-workflow version the Docker image installs.
