# Design: Contract check for the gin CLI

Epic: gin-console-rm-gin-contract

## Architecture

- `backend/src/gin_console/projects/collect.py`:
  - `_child_env` also drops `CLAUDE_CODE_SESSION_ID` (REQ-SERVER-014).
  - The executable is chosen in one place: `gin_command(gin_path: Path | None) -> list[str]`.
    - With a path, it returns `[str(path)]`, and on Windows `[bash, path]` when the file has no `.cmd`, `.bat` or `.exe` suffix.
    - Without one, it keeps today's `_resolve_cmd`.
  - The configured path reaches the runners as a module-level setting set once at startup: `configure_gin(path: Path | None, config_file: Path)`. Every runner already goes through `_run`, so this needs no change to every `build_router` signature.
  - A `FileNotFoundError` becomes `gin not found: set gin.path in <config file>` (REQ-CONFIG-010).
  - `parse_epic_workflow(data: object) -> EpicWorkflow` holds the parsing that `collect_epic_workflow` does inline today. `collect_epic_workflow` calls it and keeps turning errors into `BlockError`.
- `backend/src/gin_console/config.py`: `GinSettings(path: AbsolutePath | None = None)` (`extra="forbid"`) and `Settings.gin`.
- `backend/src/gin_console/__main__.py`:
  - Calls `configure_gin` after `load_settings`.
  - `argv[:1] == ["check-contract"]` goes to `projects.contract.main(argv[1:])`.
- `backend/src/gin_console/projects/contract.py` (new):
  - `CALLS`: one entry per call, holding the argv builder and the parse function.
    - `parse_epic_workflow`.
    - `list_milestones` and `show_milestone`, given a runner that returns the decoded JSON.
    - `load_trace` and `load_reqs`.
  - `choose_epics(snapshot) -> dict[kind, epic id | None]`: the newest epic of each kind, read with the existing `.beads/issues.jsonl` reader and `beads/kinds.py` `kind_of` (the `kind:` label, default capability).
  - `check(call, data) -> Result`:
    - Runs the parse.
    - On `pydantic.ValidationError`, maps each error to `missing: <path>` (type `missing`) or `type: <path> (<msg>)`, where the path is the error `loc` joined as `a.b[0].c`.
    - On `KeyError` or `TypeError` from the hand-written parts, reports `missing` or `type` at the key it names.
    - On a `schema` mismatch error, reports the schema line.
    - Then walks the model and the raw JSON together, listing keys present in the JSON but not in the model as `new: <path>`.
  - `main(argv, env) -> int`: argparse, `load_settings(..., check_users=False)`, `configure_gin`, then the project, the ids, each call, the report and the exit status.
- `docker-compose.yml:8` and `Dockerfile:23`: the `GIN_WORKFLOW_REF` default becomes `v3.5.4`.
- `README.md`: a "Contract check" section, and `gin.path` in the config section. `config.example.yaml`: a commented `gin:` block.

## Data Flow

1. The operator runs `check-contract`.
2. The config is loaded and `gin` is configured.
3. The project's Beads snapshot gives the epics, and `gin milestone list` gives the milestone.
4. Each call runs through `run_json`, the same function and environment the server uses.
5. The console's parse runs on each output, and the report is printed.

## Error Handling

- `gin` missing, timed out, a non-zero exit with no JSON, or invalid JSON: the call fails with the `CollectError` message and the check exits 1.
- Missing `.beads/issues.jsonl`: every kind is not covered and the `gin state` calls are skipped with a note.
- An empty milestone list: the `show` call is skipped with a note.
- Unknown project or a bad argument: exit 2.
- The check writes nothing and runs no `bd`.

## Testing

- `test_contract.py`, using a fake runner that returns canned dicts built from `tests/fake_gw.py`, `fake_gin.py` and `fakes.py`:
  - `ok`;
  - a missing key with its path;
  - a changed type;
  - a new-key note;
  - not covered;
  - an unknown project (exit 2);
  - id choice from a written export (`fake_export.py`).
- `test_collect.py`:
  - REQ-SERVER-014: the child environment has no `CLAUDE_CODE_SESSION_ID`.
  - REQ-CONFIG-010: `gin.path` is used, and the not-found message names `gin.path`. Monkeypatch `subprocess.run` or use a temporary script.
- `test_config.py`: REQ-CONFIG-010 for the default, an absolute path, and a relative path refused.
- `test_beads_workflow_api.py` still passes after the parse moves out.
- Manual evidence: `uv --directory backend run -m gin_console check-contract --project gin-console` on this host, with its output kept for the review.

## Open Technical Questions
